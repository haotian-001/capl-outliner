# CAPL Outliner

A Visual Studio Code extension for displaying the outline of CAPL (CAN Access Programming Language) code files.

## Features

This extension provides:
- Code outline for CAPL (.can) files
- Hierarchical view of functions, event handlers, variables, and constants
- Quick navigation through document symbols

The outliner recognizes:
- Functions with proper return types (void, int, float, byte, word, dword, char, long, int64, qword, double, string)
- Message handlers (`on message`)
- Timer event handlers (`on timer`)
- Key event handlers (`on key`)
- System event handlers (`on preStart`, `on start`, `on stop`)
- System variable handlers (`on sysvar`)
- Error handlers (`on error`)
- J1587 event handlers (`on J1587Message`, `on J1587Param`, `on J1587ErrorMessage`)
- Global and local variables with support for all CAPL data types (including timer, msTimer, message types)
- Constants
- Structures (`struct`) with their members and alignment attributes
- Enumerations (`enum`) with their members
- Class definitions with inheritance
- Array declarations
- Associative arrays
- Message declarations
- Compiler directives (`#pragma` directives)
- Conditional compilation directives (`#if`, `#elif`, `#else`, `#endif`, `#define`)
- Delegates

## Installation

### From VSIX File
1. Download the VSIX file from the latest release
2. In VS Code, go to Extensions view (Ctrl+Shift+X)
3. Click on "..." (More Actions) at the top of the Extensions view
4. Select "Install from VSIX..." and choose the downloaded file

### Building from Source
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Copy the entire folder to your `.vscode/extensions` directory

## Usage

1. Open a CAPL (.can) file in Visual Studio Code
2. The outline view will automatically display the structure of your code
3. Access the outline via:
   - Explorer view > Outline tab 
   - View > Outline

## Development

### Prerequisites
- Node.js
- npm

### Setup
```bash
git clone https://github.com/yourusername/capl-outliner.git
cd capl-outliner
npm install
```

### Building
```bash
npm run compile
```

### Testing
- Press F5 in VS Code to launch a new window with the extension loaded
- Open a CAPL file to test the outliner

## License

MIT 