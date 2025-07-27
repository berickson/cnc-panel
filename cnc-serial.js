class CNCSerial {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.is_connected = false;
    this.message_buffer = '';
    this.last_activity_time = 0;
    this.activity_check_interval = null;
    this.pending_commands = new Set(); // Track commands we sent
    this.final_status_timeout = null; // For delayed final status request
    this.last_work_offset = [0, 0, 0]; // Store last known work coordinate offset
    this.jog_interval = null; // For continuous jogging
    this.jog_hold_timeout = null; // To detect hold vs tap
    this.is_jogging_continuous = false; // Track continuous jog state
    this.status_polling_interval = null; // Regular status polling
    this.last_status_request_time = 0; // Track when we last requested status
    this.current_alarm_state = null; // Track current alarm state
    this.current_error_message = null; // Track current error message
    this.max_log_lines = 500; // Maximum lines to keep in log
    this.status_poll_count = 0; // Count consecutive status polls
    this.last_log_was_status = false; // Track if last log was a status message
    this.is_homing = false; // Track if we initiated homing
    this.homing_start_time = 0; // When homing started
    
    // Work coordinate management
    this.saved_xy_coordinates = this.load_saved_xy_coordinates();
    this.z_offset_valid = false; // Track if Z offset is reliable
    this.last_tool_change_time = null;
    this.tool_change_position = { x: -10, y: -10, z: 5 }; // Safe position for tool changes
    
    // UI elements
    this.connect_button = document.getElementById('connect_button');
    this.disconnect_button = document.getElementById('disconnect_button');
    this.status_button = document.getElementById('status_button');
    this.status_indicator = document.getElementById('status_indicator');
    this.status_text = document.getElementById('status_text');
    this.log_element = document.getElementById('communication_log');
    this.error_container = document.getElementById('error_container');
    this.copy_log_button = document.getElementById('copy_log_button');
    this.toggle_log_button = document.getElementById('toggle_log_button');
    this.clear_alarm_button = document.getElementById('clear_alarm_button');
    
    // Manual control elements
    this.step_size_input = document.getElementById('step_size_input');
    this.step_01_button = document.getElementById('step_01_button');
    this.step_1_button = document.getElementById('step_1_button');
    this.step_10_button = document.getElementById('step_10_button');
    
    // Jog buttons
    this.jog_x_plus_button = document.getElementById('jog_x_plus_button');
    this.jog_x_minus_button = document.getElementById('jog_x_minus_button');
    this.jog_y_plus_button = document.getElementById('jog_y_plus_button');
    this.jog_y_minus_button = document.getElementById('jog_y_minus_button');
    this.jog_z_plus_button = document.getElementById('jog_z_plus_button');
    this.jog_z_minus_button = document.getElementById('jog_z_minus_button');
    
    // Home button
    this.home_button = document.getElementById('home_button');
    
    // Zero control elements
    this.zero_all_button = document.getElementById('zero_all_button');
    this.zero_x_button = document.getElementById('zero_x_button');
    this.zero_y_button = document.getElementById('zero_y_button');
    this.zero_z_button = document.getElementById('zero_z_button');
    this.zero_xy_button = document.getElementById('zero_xy_button');
    this.go_work_zero_button = document.getElementById('go_work_zero_button');
    this.go_machine_zero_button = document.getElementById('go_machine_zero_button');
    
    // Enhanced position elements
    this.machine_x_position = document.getElementById('machine_x_position');
    this.machine_y_position = document.getElementById('machine_y_position');
    this.machine_z_position = document.getElementById('machine_z_position');
    this.work_x_position = document.getElementById('work_x_position');
    this.work_y_position = document.getElementById('work_y_position');
    this.work_z_position = document.getElementById('work_z_position');
    
    // Status elements
    this.machine_state = document.getElementById('machine_state');
    
    // Work coordinate management elements
    this.save_xy_preset_button = document.getElementById('save_xy_preset_button');
    this.xy_presets_list = document.getElementById('xy_presets_list');
    this.probe_z_button = document.getElementById('probe_z_button');
    this.tool_change_button = document.getElementById('tool_change_button');
    this.probe_feed_input = document.getElementById('probe_feed_input');
    this.tool_change_warning = document.getElementById('tool_change_warning');
    
    // Fullscreen elements
    this.fullscreen_toggle_button = document.getElementById('fullscreen_toggle_button');
    this.fullscreen_icon = document.getElementById('fullscreen_icon');
    
    // Log initialization info
    this.log(`CNC Panel initialized`);
    this.log(`Current URL: ${window.location.href}`);
    this.log(`Hostname: ${window.location.hostname}`);
    this.log(`Protocol: ${window.location.protocol}`);
    this.log(`Secure context: ${window.isSecureContext}`);
    this.log(`User agent: ${navigator.userAgent}`);
    
    this.initialize_event_listeners();
    this.check_web_serial_support();
    
    // Auto-connect if previously authorized ports are available
    this.auto_connect();
  }
  
  check_web_serial_support() {
    this.log('Checking Web Serial API support...');
    
    if (!('serial' in navigator)) {
      this.show_error('Web Serial API not supported. Please use Chrome or Edge browser.');
      this.log('ERROR: Web Serial API not found in navigator object');
      this.connect_button.disabled = true;
      return false;
    }
    
    // Check if we're in a secure context
    if (!window.isSecureContext) {
      this.show_error('Web Serial API requires a secure context (HTTPS or localhost).');
      this.log('ERROR: Not in secure context');
      this.connect_button.disabled = true;
      return false;
    }
    
    // Check if we're accessing from localhost/same origin
    const is_localhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '';
    
    if (!is_localhost) {
      this.show_error('Web Serial API requires the page to be accessed from the same computer as the CNC. Please open this page directly on the computer connected to the CNC.');
      this.log(`ERROR: Accessing from ${window.location.hostname}, but Web Serial API requires localhost access`);
      this.connect_button.disabled = true;
      return false;
    }
    
    this.log('Web Serial API support confirmed');
    return true;
  }
  
  initialize_event_listeners() {
    this.connect_button.addEventListener('click', () => this.connect());
    this.disconnect_button.addEventListener('click', () => this.disconnect());
    this.status_button.addEventListener('click', () => this.request_status());
    this.copy_log_button.addEventListener('click', () => this.copy_log());
    this.toggle_log_button.addEventListener('click', () => this.toggle_log());
    if (this.clear_alarm_button) {
      this.clear_alarm_button.addEventListener('click', () => this.clear_alarm());
    }
    
    // Add settings check button functionality
    document.addEventListener('keydown', (e) => {
      // Press 'S' to send $$ command for settings
      if (e.key.toLowerCase() === 's' && this.is_connected) {
        this.send_command('$$');
        this.log('Sent $$ to check Grbl settings (look for $22 for homing enable)');
      }
    });
    
    // Step size controls
    this.step_01_button.addEventListener('click', () => this.set_step_size(0.1));
    this.step_1_button.addEventListener('click', () => this.set_step_size(1));
    this.step_10_button.addEventListener('click', () => this.set_step_size(10));
    
    // Jog controls with hold detection
    this.setup_jog_button(this.jog_x_plus_button, 'X', '+');
    this.setup_jog_button(this.jog_x_minus_button, 'X', '-');
    this.setup_jog_button(this.jog_y_plus_button, 'Y', '+');
    this.setup_jog_button(this.jog_y_minus_button, 'Y', '-');
    this.setup_jog_button(this.jog_z_plus_button, 'Z', '+');
    this.setup_jog_button(this.jog_z_minus_button, 'Z', '-');
    
    // Home control
    this.home_button.addEventListener('click', () => this.home_all());
    
    // Zero controls
    this.zero_all_button.addEventListener('click', () => this.zero_all());
    this.zero_x_button.addEventListener('click', () => this.zero_axis('X'));
    this.zero_y_button.addEventListener('click', () => this.zero_axis('Y'));
    this.zero_z_button.addEventListener('click', () => this.zero_axis('Z'));
    this.zero_xy_button.addEventListener('click', () => this.zero_xy());
    this.go_work_zero_button.addEventListener('click', () => this.go_work_zero());
    this.go_machine_zero_button.addEventListener('click', () => this.go_machine_zero());
    
    // Work coordinate management events
    if (this.save_xy_preset_button) {
      this.save_xy_preset_button.addEventListener('click', () => {
        // Always use auto-generated names since there's no text input
        this.save_current_xy_position();
      });
    }
    
    if (this.probe_z_button) {
      this.probe_z_button.addEventListener('click', () => {
        const feed_rate = parseInt(this.probe_feed_input.value) || 50;
        this.probe_z_surface(feed_rate);
      });
    }
    
    if (this.tool_change_button) {
      this.tool_change_button.addEventListener('click', () => {
        this.goto_tool_change_position();
      });
    }
    
    if (this.fullscreen_toggle_button) {
      this.fullscreen_toggle_button.addEventListener('click', () => this.toggle_fullscreen());
    }
  }
  
  setup_jog_button(button, axis, direction) {
    let press_start_time = 0;
    let is_pressed = false;
    
    const start_press = () => {
      if (is_pressed) return;
      is_pressed = true;
      press_start_time = Date.now();
      
      // Start hold detection timer (200ms)
      this.jog_hold_timeout = setTimeout(() => {
        if (is_pressed) {
          this.start_continuous_jog(axis, direction);
        }
      }, 200);
    };
    
    const end_press = () => {
      if (!is_pressed) return;
      is_pressed = false;
      
      const press_duration = Date.now() - press_start_time;
      
      // Clear hold timeout
      if (this.jog_hold_timeout) {
        clearTimeout(this.jog_hold_timeout);
        this.jog_hold_timeout = null;
      }
      
      // Stop continuous jogging if active
      if (this.is_jogging_continuous) {
        this.stop_continuous_jog();
      } else if (press_duration < 200) {
        // Short press - single step jog
        this.jog_single_step(axis, direction);
      }
    };
    
    // Mouse events
    button.addEventListener('mousedown', start_press);
    button.addEventListener('mouseup', end_press);
    button.addEventListener('mouseleave', end_press);
    
    // Touch events
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      start_press();
    });
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      end_press();
    });
    button.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      end_press();
    });
  }
  
  async jog_single_step(axis, direction) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    const step_size = this.get_step_size();
    const distance = direction === '+' ? step_size : -step_size;
    const command = `$J=G91${axis}${distance}F1000`;
    
    // Mark activity time for jog command
    this.last_activity_time = Date.now();
    
    await this.send_command(command);
  }
  
  start_continuous_jog(axis, direction) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.is_jogging_continuous = true;
    this.log(`Starting continuous jog ${axis}${direction}`);
    
    // Mark activity time for jog command
    this.last_activity_time = Date.now();
    
    // Send continuous jog command - use proper $J= format with large distance
    const feed_rate = 1000; // mm/min
    const distance = direction === '+' ? '1000' : '-1000';
    const command = `$J=G91${axis}${distance}F${feed_rate}`;
    this.send_command(command);
  }
  
  async stop_continuous_jog() {
    if (!this.is_connected || !this.is_jogging_continuous) {
      return;
    }
    
    this.is_jogging_continuous = false;
    this.log('Stopping continuous jog');
    
    // Send jog cancel command (real-time command) - try the proper jog cancel
    if (this.writer) {
      // Use 0x85 (133) which is the proper jog cancel command for Grbl
      await this.writer.write(new Uint8Array([0x85]));
      this.log('→ (Jog Cancel 0x85)');
    }
  }
  
  async connect() {
    try {
      this.clear_error();
      
      // Only log "Attempting to connect..." if this is a manual connection
      if (!this.port) {
        this.log('Attempting to connect...');
      }
      
      // Double-check support before attempting connection
      if (!this.check_web_serial_support()) {
        return;
      }
      
      // Try to get previously authorized ports first
      const available_ports = await navigator.serial.getPorts();
      
      if (available_ports.length > 0) {
        this.log(`Found ${available_ports.length} previously authorized port(s), using the first one...`);
        this.port = available_ports[0];
      } else {
        this.log('No previously authorized ports found, requesting new port...');
        // Request a port and open a connection
        this.port = await navigator.serial.requestPort();
      }
      
      this.log('Opening connection at 115200 baud...');
      await this.port.open({ baudRate: 115200 });
      
      // Set up reader and writer
      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();
      
      this.is_connected = true;
      this.update_connection_status();
      
      this.log('Connected successfully!');
      
      // Start reading responses
      this.start_reading();
      
      // Send initial commands to wake up Grbl
      await this.send_command('\r\n\r\n');
      await this.delay(100);
      await this.send_command('$X'); // Unlock Grbl
      await this.delay(100);
      
      // Try multiple approaches to get WPos reporting
      await this.send_command('$10=1'); // First try WPos only
      await this.delay(100);
      await this.send_command('G54'); // Ensure we're in G54 coordinate system
      await this.delay(100);
      
      // Request work coordinate offset to get current WCO values
      await this.send_command('$#'); // Get coordinate system parameters
      await this.delay(100);
      
      await this.request_status(); // Get initial status
      
      // Start regular status polling at 10Hz (100ms intervals)
      this.status_polling_interval = setInterval(() => {
        if (this.is_connected) {
          const now = Date.now();
          // Only send status request if enough time has passed since last one (prevent buildup)
          if (now - this.last_status_request_time >= 95) { // 95ms to allow for some timing variance
            this.request_status();
          }
        }
      }, 100);
      
      // Check for activity more frequently (every 100ms) and request status if there was recent activity
      this.activity_check_interval = setInterval(() => {
        const now = Date.now();
        const time_since_activity = now - this.last_activity_time;
        
        // Request status if there was activity in the last 3 seconds, but not more than once per 100ms
        if (this.is_connected && time_since_activity < 3000 && time_since_activity > 10) {
          if (now - this.last_status_request_time >= 95) {
            this.request_status();
          }
        }
      }, 100);
      
      this.log('Connected - monitoring for activity');
      this.log(`Status polling at 10Hz (log folded to reduce spam, max ${this.max_log_lines} lines)`);
      
    } catch (error) {
      this.show_error(`Connection failed: ${error.message}`);
      this.log(`Error: ${error.message}`);
      
      // Provide more specific error messages
      if (error.name === 'NotFoundError') {
        this.show_error('No serial ports found or user cancelled port selection.');
      } else if (error.name === 'SecurityError') {
        this.show_error('Security error: Web Serial API may not be available in this context.');
      } else if (error.name === 'NotAllowedError') {
        this.show_error('Permission denied: User did not grant access to serial port.');
      }
    }
  }
  
  async disconnect() {
    try {
      // Clear any pending final status request
      if (this.final_status_timeout) {
        clearTimeout(this.final_status_timeout);
        this.final_status_timeout = null;
      }
      
      // Stop status polling
      if (this.status_polling_interval) {
        clearInterval(this.status_polling_interval);
        this.status_polling_interval = null;
      }
      
      // Stop activity monitoring
      if (this.activity_check_interval) {
        clearInterval(this.activity_check_interval);
        this.activity_check_interval = null;
      }
      
      // Stop status polling
      if (this.status_interval) {
        clearInterval(this.status_interval);
        this.status_interval = null;
      }
      
      if (this.reader) {
        await this.reader.cancel();
        await this.reader.releaseLock();
        this.reader = null;
      }
      
      if (this.writer) {
        await this.writer.releaseLock();
        this.writer = null;
      }
      
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      
      this.is_connected = false;
      this.message_buffer = '';
      this.current_alarm_state = null;
      this.current_error_message = null;
      this.last_log_was_status = false;
      this.status_poll_count = 0;
      this.update_connection_status();
      this.log('Disconnected');
      
    } catch (error) {
      this.show_error(`Disconnect failed: ${error.message}`);
    }
  }
  
  async start_reading() {
    try {
      while (this.port && this.port.readable && this.is_connected) {
        const { value, done } = await this.reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        
        // Don't log status responses to reduce log spam
        const trimmed_text = text.trim();
        if (!trimmed_text.startsWith('<') || !trimmed_text.endsWith('>')) {
          this.log(`← ${trimmed_text}`);
          this.last_log_was_status = false;
        } else {
          // Handle status response logging with folding
          this.log_status_response(trimmed_text);
        }
        
        // Add to buffer and process complete messages
        this.message_buffer += text;
        this.process_buffer();
      }
    } catch (error) {
      if (this.is_connected) {
        this.log(`Read error: ${error.message}`);
      }
    }
  }
  
  process_buffer() {
    let lines = this.message_buffer.split('\n');
    
    // Keep the last line in buffer (might be incomplete)
    this.message_buffer = lines.pop() || '';
    
    // Process complete lines
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        this.parse_response(trimmed);
      }
    }
    
    // Also check for complete status messages that might not end with newline
    const status_match = this.message_buffer.match(/<[^>]*>/);
    if (status_match) {
      this.parse_response(status_match[0]);
      this.message_buffer = this.message_buffer.replace(status_match[0], '');
    }
  }
  
  async send_command(command) {
    if (!this.writer || !this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    try {
      const data = new TextEncoder().encode(command + '\n');
      await this.writer.write(data);
      
      // Don't log status requests to reduce log spam
      if (command !== '?') {
        this.log(`→ ${command}`);
        this.last_log_was_status = false;
      } else {
        // Handle status request logging with folding
        this.log_status_request();
      }
      
      // Track this command so we can ignore its "ok" response
      this.pending_commands.add(command);
    } catch (error) {
      this.show_error(`Send failed: ${error.message}`);
    }
  }
  
  async request_status() {
    const now = Date.now();
    this.last_status_request_time = now;
    await this.send_command('?');
  }
  
  async clear_alarm() {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log('Clearing alarm state...');
    await this.send_command('$X'); // Unlock command
    this.current_alarm_state = null;
    // Status polling will update the UI automatically
  }
  
  // GRBL Error Code Translation
  translate_grbl_error(error_string) {
    // Extract error number from strings like "error:9" or "ALARM:1"
    const error_match = error_string.match(/error:(\d+)/i) || error_string.match(/alarm:(\d+)/i);
    if (!error_match) return error_string;
    
    const error_code = parseInt(error_match[1]);
    const is_alarm = error_string.toLowerCase().includes('alarm');
    
    if (is_alarm) {
      return this.translate_grbl_alarm(error_code, error_string);
    } else {
      return this.translate_grbl_error_code(error_code, error_string);
    }
  }
  
  translate_grbl_error_code(code, original) {
    const error_codes = {
      1: { desc: "G-code words consist of a letter and a value. Letter was not found", remedy: "Check G-code syntax" },
      2: { desc: "Numeric value format is not valid or missing an expected value", remedy: "Check number format" },
      3: { desc: "Grbl '$' system command was not recognized or supported", remedy: "Check command syntax" },
      4: { desc: "Negative value received for an expected positive value", remedy: "Use positive values only" },
      5: { desc: "Homing cycle is not enabled via settings", remedy: "Enable homing with $22=1" },
      6: { desc: "Minimum step pulse time must be greater than 3usec", remedy: "Increase step pulse time" },
      7: { desc: "EEPROM read failed. Reset and restored to default values", remedy: "Reset GRBL settings" },
      8: { desc: "Grbl '$' command cannot be used unless Grbl is IDLE", remedy: "Wait for IDLE state" },
      9: { desc: "G-code locked out during alarm or jog state", remedy: "Clear alarm or stop jog first" },
      10: { desc: "Soft limits cannot be enabled without homing also enabled", remedy: "Enable homing first" },
      11: { desc: "Max characters per line exceeded. Line was not processed and executed", remedy: "Shorten G-code lines" },
      12: { desc: "Grbl '$' setting value exceeds the maximum step rate supported", remedy: "Reduce step rate setting" },
      13: { desc: "Safety door detected as opened and door state initiated", remedy: "Close safety door" },
      14: { desc: "Build info or startup line exceeded EEPROM line length limit", remedy: "Shorten startup line" },
      15: { desc: "Jog target exceeds machine travel. Command ignored", remedy: "Reduce jog distance" },
      16: { desc: "Jog command with no '=' or contains prohibited g-code", remedy: "Fix jog command syntax" },
      17: { desc: "Laser mode requires PWM output", remedy: "Configure PWM for laser" },
      20: { desc: "Unsupported or invalid g-code command found in block", remedy: "Check G-code compatibility" },
      21: { desc: "More than one g-code command from same modal group found in block", remedy: "Use one command per group" },
      22: { desc: "Feed rate has not yet been set or is undefined", remedy: "Set feed rate with F command" },
      23: { desc: "G-code command in block requires an integer value", remedy: "Use integer values" },
      24: { desc: "Two G-code commands that both require the use of the XYZ axis words were detected in the block", remedy: "Separate axis commands" },
      25: { desc: "A G-code word was repeated in the block", remedy: "Remove duplicate words" },
      26: { desc: "A G-code command implicitly or explicitly requires XYZ axis words in the block, but none were detected", remedy: "Include axis coordinates" },
      27: { desc: "N line number value is not within the valid range of 1 - 9,999,999", remedy: "Use valid line numbers (1-9999999)" },
      28: { desc: "A G-code command was sent, but is missing some required P or L value words in the line", remedy: "Include required P or L values" },
      29: { desc: "Grbl supports six work coordinate systems G54-G59. G59.1, G59.2, and G59.3 are not supported", remedy: "Use G54-G59 only" },
      30: { desc: "The G53 G-code command requires either a G0 seek or G1 feed motion mode to be active. A different motion was active", remedy: "Use G0 or G1 with G53" },
      31: { desc: "There are unused axis words in the block and G80 motion mode cancel is active", remedy: "Remove unused axis words" },
      32: { desc: "A G2 or G3 arc was commanded but there are no XYZ axis words in the selected plane to trace the arc", remedy: "Include XYZ axis words for arc" },
      33: { desc: "The motion command has an invalid target. G2, G3, and G38.2 generates this error if the arc is impossible to generate or if the probe target is the current position", remedy: "Check target coordinates" },
      34: { desc: "A G2 or G3 arc, traced with the radius definition, had a mathematical error when computing the arc geometry", remedy: "Break arc into smaller segments" },
      35: { desc: "A G2 or G3 arc, traced with the offset definition, is missing the IJK offset word in the selected plane to trace the arc", remedy: "Include I, J, or K offset" },
      36: { desc: "There are unused, leftover G-code words that aren't used by any command in the block", remedy: "Remove unused values" },
      37: { desc: "The G43.1 dynamic tool length offset command cannot apply an offset to an axis other than its configured axis. The Grbl default axis is the Z-axis", remedy: "Apply tool offset to Z-axis only" },
      38: { desc: "Tool number greater than max supported value", remedy: "Use valid tool number" }
    };
    
    const error_info = error_codes[code];
    if (error_info) {
      return `Error ${code}: ${error_info.desc} (${error_info.remedy})`;
    } else {
      return `Error ${code}: ${original}`;
    }
  }
  
  translate_grbl_alarm(code, original) {
    const alarm_codes = {
      1: { desc: "Hard limit triggered. Machine position is likely lost due to sudden and immediate halt", remedy: "Re-homing is highly recommended" },
      2: { desc: "G-code motion target exceeds machine travel. Machine position safely retained", remedy: "Alarm may be unlocked" },
      3: { desc: "Reset while in motion. Grbl cannot guarantee position. Lost steps are likely", remedy: "Re-homing is highly recommended" },
      4: { desc: "Probe fail. The probe is not in the expected initial state before starting probe cycle", remedy: "Check probe connection and position" },
      5: { desc: "Probe fail. Probe did not contact the workpiece within the programmed travel", remedy: "Move probe closer to workpiece" },
      6: { desc: "Homing fail. Reset during active homing cycle", remedy: "Restart homing cycle" },
      7: { desc: "Homing fail. Safety door was opened during active homing cycle", remedy: "Close safety door and restart homing" },
      8: { desc: "Homing fail. Cycle failed to clear limit switch when pulling off", remedy: "Check pull-off setting and wiring" },
      9: { desc: "Homing fail. Could not find limit switch within search distance", remedy: "Check limit switch wiring and max travel settings" },
      10: { desc: "Homing fail. On dual axis machines, could not find the second limit switch for self-squaring", remedy: "Check second limit switch wiring" }
    };
    
    const alarm_info = alarm_codes[code];
    if (alarm_info) {
      return `Alarm ${code}: ${alarm_info.desc} (${alarm_info.remedy})`;
    } else if (code === 0) {
      return `Alarm 0: Invalid alarm code - GRBL alarm codes are 1-10. Check for communication issues.`;
    } else {
      return `Alarm ${code}: ${original} (Unknown alarm code)`;
    }
  }
  
  // GRBL Status Code Translation (Machine States)
  translate_grbl_status(status_code) {
    // Handle sub-states with colon notation (e.g., "Hold:0", "Door:1")
    const [main_state, sub_state] = status_code.split(':');
    
    switch (main_state) {
      case 'Idle':
        return 'Idle - Ready to receive commands';
      
      case 'Run':
        return 'Run - Executing G-code';
      
      case 'Hold':
        if (sub_state === '0') {
          return 'Hold:0 - Hold complete, ready to resume';
        } else if (sub_state === '1') {
          return 'Hold:1 - Hold in progress, reset will throw alarm';
        } else {
          return 'Hold - Feed hold active';
        }
      
      case 'Jog':
        return 'Jog - Jogging motion active';
      
      case 'Home':
        return 'Home - Homing cycle in progress';
      
      case 'Alarm':
        return 'Alarm - Emergency state, see alarm message';
      
      case 'Check':
        return 'Check - G-code check mode active';
      
      case 'Door':
        if (sub_state === '0') {
          return 'Door:0 - Door closed, ready to resume';
        } else if (sub_state === '1') {
          return 'Door:1 - Machine stopped, door ajar, cannot resume';
        } else if (sub_state === '2') {
          return 'Door:2 - Door opened, parking in progress';
        } else if (sub_state === '3') {
          return 'Door:3 - Door closed, restoring from park';
        } else {
          return 'Door - Safety door state active';
        }
      
      case 'Sleep':
        return 'Sleep - Sleep mode active, reset to wake';
      
      default:
        // Return original if not recognized, but log for debugging
        this.log(`Unknown status code: ${status_code}`);
        return status_code;
    }
  }

  // Work coordinate management methods
  load_saved_xy_coordinates() {
    try {
      const saved = localStorage.getItem('cnc_xy_coordinates');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      this.log('Failed to load saved XY coordinates');
      return {};
    }
  }
  
  save_xy_coordinates() {
    try {
      localStorage.setItem('cnc_xy_coordinates', JSON.stringify(this.saved_xy_coordinates));
      this.log('XY coordinates saved');
    } catch (error) {
      this.log('Failed to save XY coordinates');
    }
  }
  
  async save_current_xy_position(name = null) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    // Auto-generate name if not provided
    if (!name) {
      const existing_presets = Object.keys(this.saved_xy_coordinates);
      let preset_number = 1;
      let generated_name;
      
      // Find the next available preset number
      do {
        generated_name = `Preset ${preset_number}`;
        preset_number++;
      } while (existing_presets.includes(generated_name));
      
      name = generated_name;
    }
    
    // Get current machine XY position only
    const xy_pos = {
      x: parseFloat(this.machine_x_position.textContent),
      y: parseFloat(this.machine_y_position.textContent)
    };
    
    this.saved_xy_coordinates[name] = {
      ...xy_pos,
      timestamp: new Date().toISOString()
    };
    
    this.save_xy_coordinates();
    this.log(`Saved machine XY position "${name}": X${xy_pos.x} Y${xy_pos.y}`);
    this.update_xy_presets_ui();
  }
  
  async goto_saved_xy_position(name) {
    const coords = this.saved_xy_coordinates[name];
    if (!coords) {
      this.show_error(`XY position "${name}" not found`);
      return;
    }
    
    await this.send_command(`G53 G0 X${coords.x} Y${coords.y}`);
    this.log(`Moving to saved machine XY position "${name}": X${coords.x} Y${coords.y}`);
  }
  
  async goto_tool_change_position() {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    // Move Z to machine zero for safety
    await this.send_command('G53 G0 Z0');
    await this.delay(500);
    
    // Mark Z offset as unknown after tool change
    this.z_offset_valid = false;
    this.last_tool_change_time = new Date();
    this.update_z_offset_status();
    
    this.log('Moved to tool change position - Z offset now unknown');
  }
  
  async probe_z_surface(probe_feed_rate = 50, probe_distance = -20) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log('Starting Z-axis surface probe...');
    this.log('Ensure probe is connected and positioned above workpiece surface');
    
    // Send probe command - probe down until contact
    await this.send_command(`G38.2 Z${probe_distance} F${probe_feed_rate}`);
    
    // After probe completes, set this position as Z0
    await this.delay(1000);
    await this.send_command('G10 L20 P1 Z0');
    
    // Mark Z offset as valid
    this.z_offset_valid = true;
    this.update_z_offset_status();
    
    this.log('Z-axis probed and set to zero - Z offset now valid');
  }
  
  update_xy_presets_ui() {
    if (!this.xy_presets_list) return;
    
    this.xy_presets_list.innerHTML = '';
    
    for (const [name, coords] of Object.entries(this.saved_xy_coordinates)) {
      const preset_container = document.createElement('div');
      preset_container.style.cssText = 'margin-bottom: 2px;';
      preset_container.dataset.presetName = name; // Store name for reference
      
      // Main button row
      const button_container = document.createElement('div');
      button_container.style.cssText = 'display: flex; gap: 2px;';
      
      const goto_button = document.createElement('button');
      goto_button.textContent = name;
      goto_button.style.cssText = 'font-size: 12px; padding: 4px 6px; flex: 1; text-align: left;';
      goto_button.addEventListener('click', () => this.goto_saved_xy_position(name));
      
      const edit_button = document.createElement('button');
      edit_button.textContent = '⚙';
      edit_button.style.cssText = 'font-size: 12px; padding: 4px 6px; background: #6c757d; color: white;';
      edit_button.addEventListener('click', () => this.toggle_preset_editor(name, preset_container));
      
      button_container.appendChild(goto_button);
      button_container.appendChild(edit_button);
      preset_container.appendChild(button_container);
      
      this.xy_presets_list.appendChild(preset_container);
    }
  }
  
  update_z_offset_status() {
    // Update tool change button appearance
    if (this.tool_change_button) {
      if (this.z_offset_valid) {
        this.tool_change_button.style.backgroundColor = '';
        this.tool_change_button.textContent = 'Tool Change';
      } else {
        this.tool_change_button.style.backgroundColor = '#ff9800';
        this.tool_change_button.textContent = 'Tool Change ⚠️';
      }
    }

    // Update Z position display
    if (this.work_z_position) {
      if (this.z_offset_valid) {
        this.work_z_position.style.backgroundColor = '';
        this.work_z_position.style.color = '';
      } else {
        this.work_z_position.style.backgroundColor = '#ffeb3b';
        this.work_z_position.style.color = '#e65100';
      }
    }

    // Show/hide warning message
    if (this.tool_change_warning) {
      if (this.z_offset_valid) {
        this.tool_change_warning.style.display = 'none';
      } else {
        this.tool_change_warning.style.display = 'block';
        this.tool_change_warning.textContent = '⚠️ Z offset unknown - probe or set Z before running jobs';
      }
    }
  }

  parse_response(response) {
    const trimmed = response.trim();
    
    // Enhanced error handling with specific messages
    if (trimmed.startsWith('error:')) {
      let error_msg = `CNC Error: ${trimmed}`;
      
      if (trimmed === 'error:8') {
        error_msg += ' - G-code locked out. Machine may be in alarm state or limit switches active. Try moving away from limit switches first.';
      } else if (trimmed === 'error:9') {
        error_msg += ' - Homing not enabled. Send $22=1 to enable homing.';
      }
      
      const translated_error = this.translate_grbl_error(trimmed);
      this.current_error_message = `CNC Error: ${translated_error}`;
      this.show_error(this.current_error_message);
    }
    
    // Handle alarm messages
    if (trimmed.startsWith('ALARM:')) {
      const translated_alarm = this.translate_grbl_error(trimmed);
      this.current_alarm_state = trimmed;
      this.current_error_message = `CNC Alarm: ${translated_alarm}`;
      this.show_error(this.current_error_message);
    }
    
    // Also track activity for jog state changes (when machine enters/exits Jog state)
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      const status_data = trimmed.slice(1, -1);
      const parts = status_data.split('|');
      const state = parts[0];
      
      // Check if machine is no longer in alarm state
      if (this.current_alarm_state && !state.startsWith('Alarm')) {
        this.current_alarm_state = null;
        // Clear error if it was an alarm
        if (this.current_error_message && this.current_error_message.includes('Alarm')) {
          this.clear_error();
          this.current_error_message = null;
          this.log('Alarm state cleared');
        }
      }
      
      // Check if machine is in alarm state
      if (state.startsWith('Alarm')) {
        if (!this.current_alarm_state) {
          // If we see "Alarm" state but don't have a specific alarm code,
          // this means the machine is in alarm mode but we missed the specific ALARM: message
          this.current_alarm_state = 'ALARM:unknown';
          this.current_error_message = 'CNC Alarm: Machine is in alarm state. Check communication log for specific alarm details.';
          this.show_error(this.current_error_message);
          this.log('Machine entered alarm state - check for previous ALARM: messages in log');
        }
      }
      
      // If we see the machine enter Jog state and we didn't send a jog command recently,
      // this is external jogging activity
      if (state === 'Jog' && this.pending_commands.size === 0) {
        this.last_activity_time = Date.now();
      }
    }
    
    // Track activity for other non-status responses (errors, etc.)
    if (!trimmed.startsWith('<') && 
        !trimmed.endsWith('>') && 
        trimmed !== 'ok' && 
        !trimmed.startsWith('Grbl')) {
      this.last_activity_time = Date.now();
    }
    
    // Parse coordinate system parameters response from $# command
    if (trimmed.startsWith('[G54:') || trimmed.startsWith('[G55:') || trimmed.startsWith('[G56:') || 
        trimmed.startsWith('[G57:') || trimmed.startsWith('[G58:') || trimmed.startsWith('[G59:')) {
      const match = trimmed.match(/\[G54:(.*?)\]/);
      if (match) {
        const coords = match[1].split(',');
        if (coords.length >= 3) {
          // Store the G54 work coordinate offset
          this.last_work_offset = coords.map(coord => parseFloat(coord));
          this.log(`Current G54 offset: ${this.last_work_offset}`);
        }
      }
    }
    
    // Parse Grbl status report format: <State|WPos:0.000,0.000,0.000|...>
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      const status_data = trimmed.slice(1, -1); // Remove < >
      const parts = status_data.split('|');
      
      if (parts.length > 0) {
        // Machine state (Idle, Run, Hold, Home, etc.)
        const state = parts[0];
        if (this.machine_state) {
          // Enhanced status code display with GRBL v1.1 compliant states
          const status_display = this.translate_grbl_status(state);
          
          // Handle homing state management
          if (state.startsWith('Home')) {
            // We're actually in homing state
            this.machine_state.textContent = status_display;
            this.log(`*** MACHINE STATE CHANGE: ${status_display} ***`);
            
            // Update button to show we're actually homing
            const home_button = document.getElementById('home_button');
            if (home_button) {
              home_button.style.backgroundColor = '#ff6b6b';
              home_button.textContent = 'Homing...';
              home_button.disabled = true;
            }
          } else if (state === 'Idle' && this.is_homing) {
            // Homing just completed
            this.is_homing = false;
            this.machine_state.textContent = status_display;
            
            const home_button = document.getElementById('home_button');
            if (home_button) {
              home_button.style.backgroundColor = '';
              home_button.textContent = 'Home';
              home_button.disabled = false;
            }
            
            this.log('*** HOMING COMPLETED - Machine returned to Idle ***');
          } else if (!this.is_homing || (this.is_homing && Date.now() - this.homing_start_time > 5000)) {
            // Normal state update, or homing has been going for more than 5 seconds
            // (In case we missed the Home state)
            this.machine_state.textContent = status_display;
            
            if (state.startsWith('Alarm') || state.startsWith('Hold')) {
              this.log(`*** MACHINE STATE CHANGE: ${status_display} ***`);
            }
            
            // Reset homing if we're in idle and it's been a while
            if (state === 'Idle' && this.is_homing) {
              this.is_homing = false;
              const home_button = document.getElementById('home_button');
              if (home_button) {
                home_button.style.backgroundColor = '';
                home_button.textContent = 'Home';
                home_button.disabled = false;
              }
            }
          }
          // If we're in early homing state (< 5 seconds), don't override the "Starting Home..." text
        }
        
        let machine_coords = null;
        let work_coords = null;
        let work_offset = null;
        
        // Parse machine position, work position, and work coordinate offset
        for (const part of parts) {
          if (part.startsWith('MPos:')) {
            machine_coords = part.substring(5).split(',');
          } else if (part.startsWith('WPos:')) {
            work_coords = part.substring(5).split(',');
          } else if (part.startsWith('WCO:')) {
            work_offset = part.substring(4).split(',');
            // Store the new work offset for future use
            this.last_work_offset = work_offset.map(coord => parseFloat(coord));
          }
        }
        
        // Update machine position display
        if (machine_coords && machine_coords.length >= 3) {
          if (this.machine_x_position) this.machine_x_position.textContent = parseFloat(machine_coords[0]).toFixed(3);
          if (this.machine_y_position) this.machine_y_position.textContent = parseFloat(machine_coords[1]).toFixed(3);
          if (this.machine_z_position) this.machine_z_position.textContent = parseFloat(machine_coords[2]).toFixed(3);
        }
        
        // Update work position display
        if (work_coords && work_coords.length >= 3) {
          // Direct WPos data available
          if (this.work_x_position) this.work_x_position.textContent = parseFloat(work_coords[0]).toFixed(3);
          if (this.work_y_position) this.work_y_position.textContent = parseFloat(work_coords[1]).toFixed(3);
          if (this.work_z_position) this.work_z_position.textContent = parseFloat(work_coords[2]).toFixed(3);
        } else if (machine_coords && machine_coords.length >= 3) {
          // Calculate WPos from MPos using stored WCO: WPos = MPos - WCO
          const work_x = parseFloat(machine_coords[0]) - this.last_work_offset[0];
          const work_y = parseFloat(machine_coords[1]) - this.last_work_offset[1];
          const work_z = parseFloat(machine_coords[2]) - this.last_work_offset[2];
          
          if (this.work_x_position) this.work_x_position.textContent = work_x.toFixed(3);
          if (this.work_y_position) this.work_y_position.textContent = work_y.toFixed(3);
          if (this.work_z_position) this.work_z_position.textContent = work_z.toFixed(3);
        }
      }
    }
    
    // Handle other responses
    if (trimmed === 'ok') {
      // Command completed successfully
    } else if (trimmed.startsWith('Grbl')) {
      this.log(`System info: ${trimmed}`);
    }
  }
  
  log_status_request() {
    if (this.last_log_was_status) {
      this.status_poll_count++;
      // Update the last line instead of adding a new one
      this.update_last_log_line(`→ ? (x${this.status_poll_count})`);
    } else {
      this.status_poll_count = 1;
      this.log(`→ ?`);
      this.last_log_was_status = true;
    }
  }
  
  log_status_response(response) {
    if (this.last_log_was_status) {
      // Always log important states like homing, alarms, and holds
      if (response.includes('Home') || response.includes('Alarm') || response.includes('Hold') || response.includes('Door')) {
        this.log(`← ${response}`);
        this.last_log_was_status = false; // Reset so we can see the next important status change
      }
      // Don't log regular idle/run status responses to reduce spam
      return;
    } else {
      this.log(`← ${response}`);
    }
  }
  
  update_last_log_line(new_text) {
    const lines = this.log_element.textContent.split('\n');
    if (lines.length > 0) {
      // Replace the last non-empty line
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim()) {
          const timestamp = new Date().toLocaleTimeString();
          lines[i] = `[${timestamp}] ${new_text}`;
          break;
        }
      }
      this.log_element.textContent = lines.join('\n');
      this.log_element.scrollTop = this.log_element.scrollHeight;
    }
  }
  
  trim_log() {
    const lines = this.log_element.textContent.split('\n');
    if (lines.length > this.max_log_lines) {
      // Keep only the last max_log_lines
      const trimmed_lines = lines.slice(-this.max_log_lines);
      this.log_element.textContent = trimmed_lines.join('\n');
      
      // Add trim notification without calling log() to avoid recursion
      const timestamp = new Date().toLocaleTimeString();
      this.log_element.textContent += `\n[${timestamp}] [Log trimmed to ${this.max_log_lines} lines]`;
      this.log_element.scrollTop = this.log_element.scrollHeight;
    }
  }
  
  update_connection_status() {
    if (this.is_connected) {
      this.status_indicator.classList.add('connected');
      this.status_text.textContent = 'Connected';
      this.connect_button.disabled = true;
      this.disconnect_button.disabled = false;
      this.status_button.disabled = false;
      if (this.clear_alarm_button) this.clear_alarm_button.disabled = false;
      
      // Enable manual controls when connected
      this.enable_jog_controls(true);
      
      // Load and display XY presets
      this.update_xy_presets_ui();
      
      // Initialize Z offset as unknown on connect
      this.z_offset_valid = false;
      this.update_z_offset_status();
    } else {
      this.status_indicator.classList.remove('connected');
      this.status_text.textContent = 'Disconnected';
      this.connect_button.disabled = false;
      this.disconnect_button.disabled = true;
      this.status_button.disabled = true;
      if (this.clear_alarm_button) this.clear_alarm_button.disabled = true;
      
      // Disable manual controls when disconnected
      this.enable_jog_controls(false);
      
      // Reset status display
      if (this.machine_state) this.machine_state.textContent = 'Unknown';
      
      // Reset stored work offset
      this.last_work_offset = [0, 0, 0];
      
      // Reset enhanced position displays
      if (this.machine_x_position) this.machine_x_position.textContent = '0.000';
      if (this.machine_y_position) this.machine_y_position.textContent = '0.000';
      if (this.machine_z_position) this.machine_z_position.textContent = '0.000';
      if (this.work_x_position) this.work_x_position.textContent = '0.000';
      if (this.work_y_position) this.work_y_position.textContent = '0.000';
      if (this.work_z_position) this.work_z_position.textContent = '0.000';
    }
  }
  
  enable_jog_controls(enabled) {
    this.jog_x_plus_button.disabled = !enabled;
    this.jog_x_minus_button.disabled = !enabled;
    this.jog_y_plus_button.disabled = !enabled;
    this.jog_y_minus_button.disabled = !enabled;
    this.jog_z_plus_button.disabled = !enabled;
    this.jog_z_minus_button.disabled = !enabled;
    this.home_button.disabled = !enabled;
    
    // Enable/disable zero controls
    this.zero_all_button.disabled = !enabled;
    this.zero_x_button.disabled = !enabled;
    this.zero_y_button.disabled = !enabled;
    this.zero_z_button.disabled = !enabled;
    this.zero_xy_button.disabled = !enabled;
    this.go_work_zero_button.disabled = !enabled;
    this.go_machine_zero_button.disabled = !enabled;
  }
  
  set_step_size(size) {
    this.step_size_input.value = size;
  }
  
  get_step_size() {
    return parseFloat(this.step_size_input.value) || 1;
  }
  
  async home_all() {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    // Set homing state flags
    this.is_homing = true;
    this.homing_start_time = Date.now();
    
    // Immediately update UI to show homing has started
    if (this.machine_state) {
      this.machine_state.textContent = 'Starting Home...';
    }
    
    // Visual feedback on home button
    const home_button = document.getElementById('home_button');
    if (home_button) {
      home_button.style.backgroundColor = '#ffc107';
      home_button.textContent = 'Homing...';
      home_button.disabled = true;
    }
    
    this.log('*** STARTING HOME ALL AXES ***');
    this.log('Note: Homing requires limit switches to be connected and enabled in Grbl settings ($22=1)');
    this.log('Watch for "Home" state in machine status during homing cycle');
    this.log('Note: GRBL may not respond to status requests during homing - this is normal');
    
    // Mark activity for homing
    this.last_activity_time = Date.now();
    
    await this.send_command('$H');
    
    // Reset button after a delay (will be overridden by actual status updates)
    setTimeout(() => {
      if (home_button && this.is_homing) {
        home_button.style.backgroundColor = '';
        home_button.textContent = 'Home';
        home_button.disabled = false;
        this.is_homing = false;
        this.log('*** HOMING TIMEOUT - Resetting button ***');
      }
    }, 30000); // 30 second timeout
  }
  
  async home_axis(axis) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log(`Starting home ${axis} axis...`);
    this.log('Note: Homing requires limit switches to be connected and enabled in Grbl settings ($22=1)');
    this.log('Watch for "Home" state in machine status during homing cycle');
    await this.send_command(`$H${axis}`);
  }
  
  async zero_all() {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log('Setting all axes to zero...');
    await this.send_command('G10 L20 P1 X0 Y0 Z0');
    
    // Mark Z offset as valid since we just set it
    this.z_offset_valid = true;
    this.update_z_offset_status();
    this.log('Z offset now valid');
  }
  
  async zero_axis(axis) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log(`Setting ${axis} axis to zero...`);
    await this.send_command(`G10 L20 P1 ${axis}0`);
    
    // If Z axis was zeroed, mark offset as valid
    if (axis === 'Z') {
      this.z_offset_valid = true;
      this.update_z_offset_status();
      this.log('Z offset now valid');
    }
  }
  
  async zero_xy() {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log('Setting X and Y axes to zero...');
    await this.send_command('G10 L20 P1 X0 Y0');
  }
  
  async go_work_zero() {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log('Moving to work coordinate X0 Y0 (preserving Z)...');
    await this.send_command('G0 X0 Y0');
  }
  
  async go_machine_zero() {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log('Moving to machine coordinate X0 Y0 (preserving Z)...');
    await this.send_command('G53 G0 X0 Y0');
  }
  
  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.log_element.textContent += `[${timestamp}] ${message}\n`;
    this.log_element.scrollTop = this.log_element.scrollHeight;
    
    // Reset status folding for non-status messages
    if (!message.includes('?') && !message.includes('Status polling') && !message.includes('Log trimmed')) {
      this.last_log_was_status = false;
      this.status_poll_count = 0;
    }
    
    // Trim log if it gets too long (but avoid recursion)
    if (!message.includes('Log trimmed')) {
      this.trim_log();
    }
  }
  
  show_error(message) {
    this.error_container.innerHTML = `<div class="error">${message}</div>`;
  }
  
  clear_error() {
    this.error_container.innerHTML = '';
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  copy_log() {
    navigator.clipboard.writeText(this.log_element.textContent).then(() => {
      // Temporarily change button text to show success
      const original_text = this.copy_log_button.textContent;
      this.copy_log_button.textContent = 'Copied!';
      setTimeout(() => {
        this.copy_log_button.textContent = original_text;
      }, 1000);
    }).catch(err => {
      this.show_error('Failed to copy log: ' + err.message);
    });
  }
  
  toggle_log() {
    const log_visible = this.log_element.classList.contains('visible');
    if (log_visible) {
      this.log_element.classList.remove('visible');
      this.toggle_log_button.textContent = 'Show Log';
    } else {
      this.log_element.classList.add('visible');
      this.toggle_log_button.textContent = 'Hide Log';
    }
  }
  
  async auto_connect() {
    try {
      // Only attempt auto-connect if Web Serial is supported
      if (!this.check_web_serial_support()) {
        return;
      }
      
      // Check for previously authorized ports
      const available_ports = await navigator.serial.getPorts();
      
      if (available_ports.length > 0) {
        this.log(`Auto-connecting to previously authorized port...`);
        await this.connect();
      } else {
        this.log('No previously authorized ports found. Click "Connect to CNC" to select a port.');
      }
    } catch (error) {
      this.log(`Auto-connect failed: ${error.message}`);
      // Don't show error for auto-connect failure, just log it
    }
  }
  
  toggle_preset_editor(preset_name, preset_container) {
    // Check if editor is already open
    const existing_editor = preset_container.querySelector('.preset-editor');
    if (existing_editor) {
      existing_editor.remove();
      return;
    }
    
    const coords = this.saved_xy_coordinates[preset_name];
    if (!coords) return;
    
    // Create editor panel
    const editor = document.createElement('div');
    editor.className = 'preset-editor';
    editor.style.cssText = 'background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 6px; margin-top: 2px; font-size: 11px;';
    
    // Name editing
    const name_row = document.createElement('div');
    name_row.style.cssText = 'display: flex; gap: 4px; margin-bottom: 4px; align-items: center;';
    
    const name_label = document.createElement('span');
    name_label.textContent = 'Name:';
    name_label.style.cssText = 'width: 40px; font-weight: bold;';
    
    const name_input = document.createElement('input');
    name_input.type = 'text';
    name_input.value = preset_name;
    name_input.style.cssText = 'font-size: 11px; padding: 2px 4px; flex: 1; border: 1px solid #ccc; border-radius: 2px;';
    
    name_row.appendChild(name_label);
    name_row.appendChild(name_input);
    
    // Coordinates display/editing
    const coords_row = document.createElement('div');
    coords_row.style.cssText = 'display: flex; gap: 4px; margin-bottom: 4px; align-items: center;';
    
    const coords_label = document.createElement('span');
    coords_label.textContent = 'MPos:';
    coords_label.style.cssText = 'width: 40px; font-weight: bold;';
    
    const x_input = document.createElement('input');
    x_input.type = 'number';
    x_input.step = '0.001';
    x_input.value = coords.x;
    x_input.style.cssText = 'font-size: 11px; padding: 2px 4px; width: 60px; border: 1px solid #ccc; border-radius: 2px;';
    
    const y_input = document.createElement('input');
    y_input.type = 'number';
    y_input.step = '0.001';
    y_input.value = coords.y;
    y_input.style.cssText = 'font-size: 11px; padding: 2px 4px; width: 60px; border: 1px solid #ccc; border-radius: 2px;';
    
    coords_row.appendChild(coords_label);
    coords_row.appendChild(document.createTextNode('X:'));
    coords_row.appendChild(x_input);
    coords_row.appendChild(document.createTextNode('Y:'));
    coords_row.appendChild(y_input);
    
    // Action buttons
    const actions_row = document.createElement('div');
    actions_row.style.cssText = 'display: flex; gap: 2px; justify-content: flex-end;';
    
    const save_button = document.createElement('button');
    save_button.textContent = 'Save';
    save_button.style.cssText = 'font-size: 11px; padding: 3px 8px; background: #28a745; color: white; border: none; border-radius: 2px;';
    save_button.addEventListener('click', () => {
      this.save_preset_changes(preset_name, name_input.value.trim(), parseFloat(x_input.value), parseFloat(y_input.value));
      editor.remove();
    });
    
    const delete_button = document.createElement('button');
    delete_button.textContent = 'Delete';
    delete_button.style.cssText = 'font-size: 11px; padding: 3px 8px; background: #dc3545; color: white; border: none; border-radius: 2px;';
    delete_button.addEventListener('click', () => {
      if (confirm(`Delete preset "${preset_name}"?`)) {
        delete this.saved_xy_coordinates[preset_name];
        this.save_xy_coordinates();
        this.update_xy_presets_ui();
        this.log(`Deleted machine XY position "${preset_name}"`);
      }
    });
    
    const cancel_button = document.createElement('button');
    cancel_button.textContent = 'Cancel';
    cancel_button.style.cssText = 'font-size: 11px; padding: 3px 8px; background: #6c757d; color: white; border: none; border-radius: 2px;';
    cancel_button.addEventListener('click', () => {
      editor.remove();
    });
    
    actions_row.appendChild(save_button);
    actions_row.appendChild(delete_button);
    actions_row.appendChild(cancel_button);
    
    // Assemble editor
    editor.appendChild(name_row);
    editor.appendChild(coords_row);
    editor.appendChild(actions_row);
    
    preset_container.appendChild(editor);
    
    // Focus name input for quick editing
    name_input.focus();
    name_input.select();
  }
  
  save_preset_changes(old_name, new_name, new_x, new_y) {
    // Validate inputs
    if (!new_name) {
      this.show_error('Preset name cannot be empty');
      return;
    }
    
    if (isNaN(new_x) || isNaN(new_y)) {
      this.show_error('Invalid coordinates');
      return;
    }
    
    // Check for name conflicts (unless it's the same name)
    if (new_name !== old_name && this.saved_xy_coordinates[new_name]) {
      this.show_error(`Preset name "${new_name}" already exists`);
      return;
    }
    
    // Remove old preset if name changed
    if (new_name !== old_name) {
      delete this.saved_xy_coordinates[old_name];
    }
    
    // Save updated preset
    this.saved_xy_coordinates[new_name] = {
      x: new_x,
      y: new_y,
      timestamp: new Date().toISOString()
    };
    
    this.save_xy_coordinates();
    this.update_xy_presets_ui();
    
    if (new_name !== old_name) {
      this.log(`Renamed preset "${old_name}" to "${new_name}" and updated coordinates to X${new_x} Y${new_y}`);
    } else {
      this.log(`Updated preset "${new_name}" coordinates to X${new_x} Y${new_y}`);
    }
  }
  
  toggle_fullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      this.set_fullscreen_icon(true);
    } else {
      document.exitFullscreen();
      this.set_fullscreen_icon(false);
    }
  }

  set_fullscreen_icon(is_fullscreen) {
    if (this.fullscreen_icon) {
      this.fullscreen_icon.textContent = is_fullscreen ? '🡼' : '⛶';
    }
  }

}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  const serial = new CNCSerial();
  // Setup fullscreen button event listener here to ensure DOM is ready
  const fullscreen_toggle_button = document.getElementById('fullscreen_toggle_button');
  if (fullscreen_toggle_button) {
    fullscreen_toggle_button.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        const icon = document.getElementById('fullscreen_icon');
        if (icon) icon.textContent = '🡼';
      } else {
        document.exitFullscreen();
        const icon = document.getElementById('fullscreen_icon');
        if (icon) icon.textContent = '⛶';
      }
    });
    // Listen for fullscreen changes to update icon
    document.addEventListener('fullscreenchange', () => {
      const icon = document.getElementById('fullscreen_icon');
      if (icon) icon.textContent = document.fullscreenElement ? '🡼' : '⛶';
    });
  }
});
