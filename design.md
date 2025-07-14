software is designed to work in kiosk-mode with no keyboard or mouse
It will be a progressive web app meaning it can run offline, and get updated by the server

## Work Coordinate Management

The system manages work coordinates to enable precise positioning and tool changes while maintaining safety and accuracy.

### Core Principles
- **XY positions are persistent** - Saved to localStorage and survive power cycles
- **Z positions are never saved** - Different tools have different lengths, making saved Z positions unreliable
- **Z offset tracking** - System tracks whether current Z offset is valid for the installed tool
- **Tool change safety** - After tool changes, Z offset is marked as "unknown" until re-established

### XY Position Presets
- Users can save current XY work coordinates into preset slots, and optionally give descriptive names (e.g., "part_corner", "vise_center")
- Saved positions only include X and Y coordinates
- Recalling a position moves only to XY coordinates, Z remains at current height for safety
- Positions are stored in browser localStorage for persistence

### Z Offset Management
- Z offset validity is tracked per tool change
- After tool change, Z offset is marked as "unknown"
- User must re-establish Z offset before running jobs via:
  - Z surface probing (automatic)
  - Manual Z zero setting
- System provides visual warnings when Z offset (attention color for prop and zero buttons) 
- Job execution is disabled until Z offset is valid

### Tool Change Workflow
1. User initiates tool change - machine moves to safe position
2. Z offset automatically marked as "unknown"
3. User changes tool manually
4. User must re-establish Z offset (probe or manual zero)
5. Only then can jobs be executed safely

### Probing Operations
- **Z Surface Probing**: Automatically finds workpiece surface and sets Z=0
- Configurable probe feed rate for different materials
- Safety checks ensure probe is connected before operation
- No XY probing (requires physical probe setup not available)

### Safety Features
- Visual indicators show Z offset status (valid/unknown)
- Job execution buttons disabled when Z offset invalid
- Tool change button shows warning state when Z needs setup


  ```mermaid
  graph TD
    User --> Home["Use Touch Panel"]

    Home --> Jog["Jog / Position Machine"]
    Home --> RunJob["Run G-code Job"]
    Home --> QuickOps["Run Quick Operation"]
    Home --> Settings["Adjust Settings"]

    QuickOps --> Facing["Run Facing Operation"]
    QuickOps --> EdgeClean["Run Edge Cleanup"]
    QuickOps --> Cut["Make Straight Cut"]
    QuickOps --> Drill["Drill Hole(s)"]
    QuickOps --> Pocket["Mill Simple Pocket"]

    RunJob --> LoadGCode["Load G-code File"]
    RunJob --> ExecuteJob["Execute Program"]
    RunJob --> Override["Adjust Feed/Spindle"]

    Jog --> MoveAxes["Move X/Y/Z"]
    Jog --> SetZero["Set Origin"]
    Jog --> Probe["Probe Workpiece"]

    Settings --> Units["Change Units"]
    Settings --> Network["Configure Network"]
    Settings --> Firmware["Firmware Settings"]
```