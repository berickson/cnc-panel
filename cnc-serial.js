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
    
    // UI elements
    this.connect_button = document.getElementById('connect_button');
    this.disconnect_button = document.getElementById('disconnect_button');
    this.status_button = document.getElementById('status_button');
    this.status_indicator = document.getElementById('status_indicator');
    this.status_text = document.getElementById('status_text');
    this.log_element = document.getElementById('communication_log');
    this.error_container = document.getElementById('error_container');
    this.copy_log_button = document.getElementById('copy_log_button');
    
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
    
    // Home buttons
    this.home_all_button = document.getElementById('home_all_button');
    this.home_x_button = document.getElementById('home_x_button');
    this.home_y_button = document.getElementById('home_y_button');
    this.home_z_button = document.getElementById('home_z_button');
    
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
    this.x_position = document.getElementById('x_position');
    this.y_position = document.getElementById('y_position');
    this.z_position = document.getElementById('z_position');
    
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
    
    // Home controls
    this.home_all_button.addEventListener('click', () => this.home_all());
    this.home_x_button.addEventListener('click', () => this.home_axis('X'));
    this.home_y_button.addEventListener('click', () => this.home_axis('Y'));
    this.home_z_button.addEventListener('click', () => this.home_axis('Z'));
    
    // Zero controls
    this.zero_all_button.addEventListener('click', () => this.zero_all());
    this.zero_x_button.addEventListener('click', () => this.zero_axis('X'));
    this.zero_y_button.addEventListener('click', () => this.zero_axis('Y'));
    this.zero_z_button.addEventListener('click', () => this.zero_axis('Z'));
    this.zero_xy_button.addEventListener('click', () => this.zero_xy());
    this.go_work_zero_button.addEventListener('click', () => this.go_work_zero());
    this.go_machine_zero_button.addEventListener('click', () => this.go_machine_zero());
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
    
    await this.send_command(command);
  }
  
  start_continuous_jog(axis, direction) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.is_jogging_continuous = true;
    this.log(`Starting continuous jog ${axis}${direction}`);
    
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
      
      // Check for activity more frequently (every 50ms = 20 times per second) and request status if there was recent activity
      this.activity_check_interval = setInterval(() => {
        const now = Date.now();
        if (this.is_connected && (now - this.last_activity_time) < 2000 && (now - this.last_activity_time) > 50) {
          this.request_status();
        }
      }, 50);
      
      this.log('Connected - monitoring for activity');
      
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
        this.log(`← ${text.trim()}`);
        
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
      this.log(`→ ${command}`);
      
      // Track this command so we can ignore its "ok" response
      this.pending_commands.add(command);
    } catch (error) {
      this.show_error(`Send failed: ${error.message}`);
    }
  }
  
  async request_status() {
    await this.send_command('?');
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
      
      this.show_error(error_msg);
    }
    
    // Also track activity for jog state changes (when machine enters/exits Jog state)
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      const status_data = trimmed.slice(1, -1);
      const parts = status_data.split('|');
      const state = parts[0];
      
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
        // Machine state (Idle, Run, Hold, etc.)
        this.machine_state.textContent = parts[0];
        
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
          this.machine_x_position.textContent = parseFloat(machine_coords[0]).toFixed(3);
          this.machine_y_position.textContent = parseFloat(machine_coords[1]).toFixed(3);
          this.machine_z_position.textContent = parseFloat(machine_coords[2]).toFixed(3);
          
          // Also update the main position display (legacy)
          this.x_position.textContent = parseFloat(machine_coords[0]).toFixed(3);
          this.y_position.textContent = parseFloat(machine_coords[1]).toFixed(3);
          this.z_position.textContent = parseFloat(machine_coords[2]).toFixed(3);
        }
        
        // Update work position display
        if (work_coords && work_coords.length >= 3) {
          // Direct WPos data available
          this.work_x_position.textContent = parseFloat(work_coords[0]).toFixed(3);
          this.work_y_position.textContent = parseFloat(work_coords[1]).toFixed(3);
          this.work_z_position.textContent = parseFloat(work_coords[2]).toFixed(3);
        } else if (machine_coords && machine_coords.length >= 3) {
          // Calculate WPos from MPos using stored WCO: WPos = MPos - WCO
          const work_x = parseFloat(machine_coords[0]) - this.last_work_offset[0];
          const work_y = parseFloat(machine_coords[1]) - this.last_work_offset[1];
          const work_z = parseFloat(machine_coords[2]) - this.last_work_offset[2];
          
          this.work_x_position.textContent = work_x.toFixed(3);
          this.work_y_position.textContent = work_y.toFixed(3);
          this.work_z_position.textContent = work_z.toFixed(3);
        }
      }
    }
    
    // Handle other responses
    if (trimmed === 'ok') {
      // Command completed successfully
    } else if (trimmed.startsWith('error:')) {
      this.show_error(`CNC Error: ${trimmed}`);
    } else if (trimmed.startsWith('Grbl')) {
      this.log(`System info: ${trimmed}`);
    }
  }
  
  update_connection_status() {
    if (this.is_connected) {
      this.status_indicator.classList.add('connected');
      this.status_text.textContent = 'Connected';
      this.connect_button.disabled = true;
      this.disconnect_button.disabled = false;
      this.status_button.disabled = false;
      
      // Enable manual controls when connected
      this.enable_jog_controls(true);
    } else {
      this.status_indicator.classList.remove('connected');
      this.status_text.textContent = 'Disconnected';
      this.connect_button.disabled = false;
      this.disconnect_button.disabled = true;
      this.status_button.disabled = true;
      
      // Disable manual controls when disconnected
      this.enable_jog_controls(false);
      
      // Reset status display
      this.machine_state.textContent = 'Unknown';
      this.x_position.textContent = '0.000';
      this.y_position.textContent = '0.000';
      this.z_position.textContent = '0.000';
      
      // Reset stored work offset
      this.last_work_offset = [0, 0, 0];
      
      // Reset enhanced position displays
      this.machine_x_position.textContent = '0.000';
      this.machine_y_position.textContent = '0.000';
      this.machine_z_position.textContent = '0.000';
      this.work_x_position.textContent = '0.000';
      this.work_y_position.textContent = '0.000';
      this.work_z_position.textContent = '0.000';
    }
  }
  
  enable_jog_controls(enabled) {
    this.jog_x_plus_button.disabled = !enabled;
    this.jog_x_minus_button.disabled = !enabled;
    this.jog_y_plus_button.disabled = !enabled;
    this.jog_y_minus_button.disabled = !enabled;
    this.jog_z_plus_button.disabled = !enabled;
    this.jog_z_minus_button.disabled = !enabled;
    this.home_all_button.disabled = !enabled;
    this.home_x_button.disabled = !enabled;
    this.home_y_button.disabled = !enabled;
    this.home_z_button.disabled = !enabled;
    
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
    
    this.log('Starting home all axes...');
    this.log('Note: Homing requires limit switches to be connected and enabled in Grbl settings ($22=1)');
    await this.send_command('$H');
  }
  
  async home_axis(axis) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log(`Starting home ${axis} axis...`);
    this.log('Note: Homing requires limit switches to be connected and enabled in Grbl settings ($22=1)');
    await this.send_command(`$H${axis}`);
  }
  
  async zero_all() {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log('Setting all axes to zero...');
    await this.send_command('G10 L20 P1 X0 Y0 Z0');
  }
  
  async zero_axis(axis) {
    if (!this.is_connected) {
      this.show_error('Not connected to CNC');
      return;
    }
    
    this.log(`Setting ${axis} axis to zero...`);
    await this.send_command(`G10 L20 P1 ${axis}0`);
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
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  new CNCSerial();
});
