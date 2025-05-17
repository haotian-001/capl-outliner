# CAPL Outliner

A Visual Studio Code extension for displaying the outline of CAPL (CAN Access Programming Language) code files and providing code navigation features.

Starting with version 0.5.0 the extension uses a Python-based language server communicating over the Language Server Protocol.

## Features

This extension provides:
- Code outline for CAPL (.can) files
- Hierarchical view of functions, event handlers, variables, and constants
- Quick navigation through document symbols
- **Jump-to-definition** functionality for navigating to function and variable declarations

### Code Outline

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

### Jump-to-Definition

The extension allows you to navigate to the definition of symbols by:
- Holding Ctrl (Windows/Linux) or Cmd (Mac) and clicking on a function name or variable
- The editor will jump to where that function or variable is defined
- Works with definitions in both the current file and included files
- Supports CAPL's unique include syntax: 
  ```
  includes
  {
    #include "file1.cin"
    #include "file2.cin"
  }
  ```

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
4. To navigate to a function or variable definition:
   - Hold Ctrl (Windows/Linux) or Cmd (Mac) and click on the symbol name
   - The editor will jump to the definition location

## Development

### Prerequisites
- Node.js
- npm
- Python 3
- pip

### Setup
```bash
git clone https://github.com/haotian-001/capl-outliner.git
cd capl-outliner
npm install
pip install pygls
```

### Building
```bash
npm run compile
```

### Packaging
```bash
npm run package
```
The extension uses `.vscodeignore` to exclude unnecessary files like the `refs` folder from the package, keeping the VSIX file size manageable.

### Testing
- Press F5 in VS Code to launch a new window with the extension loaded
- Open a CAPL file to test the outliner

## License

MIT 