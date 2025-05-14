import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    // Register the document symbol provider for CAPL files
    const documentSymbolProvider = new CaplDocumentSymbolProvider();
    const selector = { scheme: 'file', language: 'capl' };
    
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(selector, documentSymbolProvider)
    );
    
    // Register the definition provider for CAPL files
    const definitionProvider = new CaplDefinitionProvider();
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(selector, definitionProvider)
    );
    
    console.log('CAPL Outliner extension activated');
}

export function deactivate() {
    console.log('CAPL Outliner extension deactivated');
}

class CaplDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        return this.parseDocument(document);
    }

    private parseDocument(document: vscode.TextDocument): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        const text = document.getText();
        const lines = text.split(/\r?\n/);

        // Regex patterns for various CAPL elements
        const functionPattern = /^(void|int|float|byte|word|dword|char|long|int64|qword|double|string|enum\s+[a-zA-Z_][a-zA-Z0-9_]*|struct\s+[a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
        
        // Test-related patterns
        const testcasePattern = /^(?:export\s+)?testcase\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
        const testfunctionPattern = /^(?:export\s+)?testfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
        
        // Event handlers
        const onMessagePattern = /^on\s+([a-zA-Z0-9_]+)\s*{/;
        const onTimerPattern = /^on\s+timer\s+([a-zA-Z0-9_]+)\s*{/;
        const onKeyPattern = /^on\s+key\s+([a-zA-Z0-9_]+)\s*{/;
        const onPreStartPattern = /^on\s+preStart\s*{/;
        const onStartPattern = /^on\s+start\s*{/;
        const onStopPattern = /^on\s+stop\s*{/;
        const onSystemVarPattern = /^on\s+sysvar\s+([a-zA-Z0-9_.]+)\s*{/;
        const onErrorPattern = /^on\s+error\s+([a-zA-Z0-9_]+)\s*{/;
        const onJ1587MessagePattern = /^on\s+J1587Message\s+([a-zA-Z0-9_]+)\s*{/;
        const onJ1587ParamPattern = /^on\s+J1587Param\s+([a-zA-Z0-9_]+)\s*{/;
        const onJ1587ErrorMessagePattern = /^on\s+J1587ErrorMessage\s+([a-zA-Z0-9_]+)\s*{/;
        
        // Ethernet and IP-related event handlers
        const onEthernetPacketPattern = /^on\s+ethernetPacket\s+([a-zA-Z0-9_]+)\s*{/;
        const onEthernetErrorPacketPattern = /^on\s+ethernetErrorPacket\s+([a-zA-Z0-9_]+)\s*{/;
        const onEthLinkStateChangePattern = /^on\s+ethLinkStateChange\s+([a-zA-Z0-9_]+)\s*{/;
        
        // Variables, constants, and data structures
        const variablePattern = /^(?!.*\[)(?:_align\(\d+\)\s+)?(?:(?:static|unsigned|signed|volatile|extern)\s+)*(int|float|byte|word|dword|char|long|int64|qword|double|string|timer|msTimer|message|FRFrame|FRPDU|linFrame|a429word|Signal\s*\*|diagRequest|diagResponse|J1587Message|J1587Param|sysvar\s*\*|sysvarInt\s*\*|sysvarFloat\s*\*|sysvarString\s*\*|ethernetPacket|ethernetErrorPacket|ethernetPort|ethernetPortAccessEntity|ethernetMacsecConfiguration|ethernetMacsecSecureEntity|IP_Address|IP_Endpoint|Eth)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*(?:\[.*\])?\s*(?:=.*)?;\s*(?:\/\/.*)?$/;
        const constPattern = /^const\s+(int|float|byte|word|dword|char|long|int64|qword|double|string)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\[.*\])?\s*(?:=.*)?;\s*(?:\/\/.*)?$/;
        const structPattern = /^(?:_align\(\d+\)\s+)?struct\s*(?:([A-Za-z_][A-Za-z0-9_]*)\s*)?{/;
        // Struct declaration spread over two lines (opening brace on the next line)
        const structStartPattern = /^(?:_align\(\d+\)\s+)?struct\s*(?:([A-Za-z_][A-Za-z0-9_]*)\s*)?$/;
        const structWithVarPattern = /^(?:_align\(\d+\)\s+)?struct\s*(?:([A-Za-z_][A-Za-z0-9_]*)\s*)?\{\s*[\s\S]*?\}\s*([A-Za-z_][A-Za-z0-9_]*)\s*;\s*$/;
        const structVarPattern = /^struct\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*=\s*\{.*\})?\s*;\s*(?:\/\/.*)?$/;
        const enumPattern = /^enum\s+(?:([a-zA-Z_][a-zA-Z0-9_]*)\s*)?{/;
        const enumStartPattern = /^enum\s+(?:([a-zA-Z_][a-zA-Z0-9_]*)\s*)?$/;
        const classPattern = /^class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:extends\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*)?{/;
        const messageDeclarationPattern = /^message\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=.*)?;/;
        const arrayDeclarationPattern = /^(int|float|byte|word|dword|char|long|int64|qword|double|string)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\[.*\]\s*(?:=.*)?;/;
        const associativeArrayPattern = /^((?:int|float|byte|word|dword|char|long|int64|qword|double|string|struct\s+[a-zA-Z_][a-zA-Z0-9_]*))\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\[(.+)\]\s*(?:=.*)?;/;
        
        // IP-related declarations
        const ipAddressPattern = /^IP_Address\s+(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[\da-fA-F:]+|\[[\da-fA-F:]+\])\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/;
        const ipEndpointPattern = /^IP_Endpoint\s+(?:TCP:|UDP:)?(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[?[\da-fA-F:]+\]?)(?::\d+)?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/;
        
        // Ethernet channel reference
        const ethChannelPattern = /^Eth\s+(\d+)\s*;/;
        
        // Compiler directives
        const pragmaPattern = /^#pragma\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(.+)/;
        const conditionalCompilationPattern = /^#(?:if|elif|else|endif|define)\b\s*(.*)/;
        
        // Delegates
        const delegatePattern = /^delegate\s*\(([^)]*)\)\s*{/;
        
        // Track brace nesting to determine function ranges
        let braceStack: number[] = [];
        let currentSymbol: vscode.DocumentSymbol | null = null;
        let currentStructOrEnum: vscode.DocumentSymbol | null = null;
        // Remember the parent we were inside before diving into a nested struct/enum
        const parentSymbolStack: (vscode.DocumentSymbol | null)[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineRange = new vscode.Range(
                new vscode.Position(i, 0),
                new vscode.Position(i, lines[i].length)
            );
            
            // Check for pragma directives
            const pragmaMatch = line.match(pragmaPattern);
            if (pragmaMatch) {
                const pragmaName = pragmaMatch[1];
                const pragmaValue = pragmaMatch[2].trim();
                const pragmaSymbol = new vscode.DocumentSymbol(
                    `#pragma ${pragmaName}`,
                    pragmaValue,
                    vscode.SymbolKind.Null,
                    lineRange,
                    lineRange
                );
                
                symbols.push(pragmaSymbol);
                continue;
            }
            
            // Check for conditional compilation directives
            const conditionalMatch = line.match(conditionalCompilationPattern);
            if (conditionalMatch) {
                const conditionalDirective = line.startsWith('#define') ? '#define' : line.split(/\s+/)[0];
                const conditionalValue = conditionalMatch[1] || '';
                const conditionalSymbol = new vscode.DocumentSymbol(
                    conditionalDirective,
                    conditionalValue,
                    vscode.SymbolKind.Null,
                    lineRange,
                    lineRange
                );
                
                symbols.push(conditionalSymbol);
                continue;
            }
            
            // Check for functions
            const functionMatch = line.match(functionPattern);
            if (functionMatch && !line.endsWith(';')) {
                const returnType = functionMatch[1];
                const functionName = functionMatch[2];
                
                // Look ahead to find the closing parenthesis for function parameters
                let parameterStr = '';
                let j = i;
                let bracketCount = 1; // Start with 1 for the opening parenthesis
                let lineText = lines[j].substring(lines[j].indexOf('(') + 1);
                
                // Extract the parameter string by scanning forward until we find a balanced closing parenthesis
                while (j < lines.length && bracketCount > 0) {
                    for (let k = 0; k < lineText.length; k++) {
                        const char = lineText.charAt(k);
                        if (char === '(') bracketCount++;
                        else if (char === ')') bracketCount--;
                        
                        if (bracketCount === 0) {
                            parameterStr += lineText.substring(0, k);
                            break;
                        }
                    }
                    
                    if (bracketCount > 0) {
                        parameterStr += lineText + ' ';
                        j++;
                        if (j < lines.length) lineText = lines[j];
                    } else {
                        break; // Exit loop if we've found the closing parenthesis
                    }
                }
                
                const parameters = parameterStr.trim();
                const functionSignature = `${returnType} ${functionName}(${parameters})`;
                
                const functionSymbol = new vscode.DocumentSymbol(
                    functionName,
                    functionSignature,
                    vscode.SymbolKind.Function,
                    lineRange,
                    lineRange
                );
                
                currentSymbol = functionSymbol;
                symbols.push(functionSymbol);
                braceStack = [];
                continue;
            }
            
            // Check for testcases
            const testcaseMatch = line.match(testcasePattern);
            if (testcaseMatch) {
                const testcaseName = testcaseMatch[1];
                
                // Look ahead to find the closing parenthesis for testcase parameters
                let parameterStr = '';
                let j = i;
                let bracketCount = 1; // Start with 1 for the opening parenthesis
                let lineText = lines[j].substring(lines[j].indexOf('(') + 1);
                
                // Extract the parameter string by scanning forward until we find a balanced closing parenthesis
                while (j < lines.length && bracketCount > 0) {
                    for (let k = 0; k < lineText.length; k++) {
                        const char = lineText.charAt(k);
                        if (char === '(') bracketCount++;
                        else if (char === ')') bracketCount--;
                        
                        if (bracketCount === 0) {
                            parameterStr += lineText.substring(0, k);
                            break;
                        }
                    }
                    
                    if (bracketCount > 0) {
                        parameterStr += lineText + ' ';
                        j++;
                        if (j < lines.length) lineText = lines[j];
                    } else {
                        break; // Exit loop if we've found the closing parenthesis
                    }
                }
                
                const parameters = parameterStr.trim();
                const testcaseSignature = `testcase ${testcaseName}(${parameters})`;
                
                const testcaseSymbol = new vscode.DocumentSymbol(
                    testcaseName,
                    testcaseSignature,
                    vscode.SymbolKind.Method,
                    lineRange,
                    lineRange
                );
                
                currentSymbol = testcaseSymbol;
                symbols.push(testcaseSymbol);
                braceStack = [];
                continue;
            }
            
            // Check for test functions
            const testfunctionMatch = line.match(testfunctionPattern);
            if (testfunctionMatch) {
                const testfunctionName = testfunctionMatch[1];
                
                // Look ahead to find the closing parenthesis for testfunction parameters
                let parameterStr = '';
                let j = i;
                let bracketCount = 1; // Start with 1 for the opening parenthesis
                let lineText = lines[j].substring(lines[j].indexOf('(') + 1);
                
                // Extract the parameter string by scanning forward until we find a balanced closing parenthesis
                while (j < lines.length && bracketCount > 0) {
                    for (let k = 0; k < lineText.length; k++) {
                        const char = lineText.charAt(k);
                        if (char === '(') bracketCount++;
                        else if (char === ')') bracketCount--;
                        
                        if (bracketCount === 0) {
                            parameterStr += lineText.substring(0, k);
                            break;
                        }
                    }
                    
                    if (bracketCount > 0) {
                        parameterStr += lineText + ' ';
                        j++;
                        if (j < lines.length) lineText = lines[j];
                    } else {
                        break; // Exit loop if we've found the closing parenthesis
                    }
                }
                
                const parameters = parameterStr.trim();
                const testfunctionSignature = `testfunction ${testfunctionName}(${parameters})`;
                
                const testfunctionSymbol = new vscode.DocumentSymbol(
                    testfunctionName,
                    testfunctionSignature,
                    vscode.SymbolKind.Method,
                    lineRange,
                    lineRange
                );
                
                currentSymbol = testfunctionSymbol;
                symbols.push(testfunctionSymbol);
                braceStack = [];
                continue;
            }
            
            // Check for event handlers
            let eventMatch = null;
            let eventSymbol = null;
            let eventType = '';
            
            if (line.match(onMessagePattern)) {
                eventMatch = line.match(onMessagePattern);
                eventType = 'Message Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onTimerPattern)) {
                eventMatch = line.match(onTimerPattern);
                eventType = 'Timer Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on timer ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onKeyPattern)) {
                eventMatch = line.match(onKeyPattern);
                eventType = 'Key Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on key ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onPreStartPattern)) {
                eventType = 'PreStart Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    'on preStart',
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onStartPattern)) {
                eventType = 'Start Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    'on start',
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onStopPattern)) {
                eventType = 'Stop Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    'on stop',
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onSystemVarPattern)) {
                eventMatch = line.match(onSystemVarPattern);
                eventType = 'System Variable Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on sysvar ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onErrorPattern)) {
                eventMatch = line.match(onErrorPattern);
                eventType = 'Error Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on error ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onJ1587MessagePattern)) {
                eventMatch = line.match(onJ1587MessagePattern);
                eventType = 'J1587 Message Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on J1587Message ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onJ1587ParamPattern)) {
                eventMatch = line.match(onJ1587ParamPattern);
                eventType = 'J1587 Parameter Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on J1587Param ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onJ1587ErrorMessagePattern)) {
                eventMatch = line.match(onJ1587ErrorMessagePattern);
                eventType = 'J1587 Error Message Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on J1587ErrorMessage ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onEthernetPacketPattern)) {
                eventMatch = line.match(onEthernetPacketPattern);
                eventType = 'Ethernet Packet Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on ethernetPacket ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onEthernetErrorPacketPattern)) {
                eventMatch = line.match(onEthernetErrorPacketPattern);
                eventType = 'Ethernet Error Packet Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on ethernetErrorPacket ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            } else if (line.match(onEthLinkStateChangePattern)) {
                eventMatch = line.match(onEthLinkStateChangePattern);
                eventType = 'Ethernet Link State Change Handler';
                eventSymbol = new vscode.DocumentSymbol(
                    `on ethLinkStateChange ${eventMatch![1]}`,
                    eventType,
                    vscode.SymbolKind.Event,
                    lineRange,
                    lineRange
                );
            }
            
            if (eventSymbol) {
                currentSymbol = eventSymbol;
                symbols.push(eventSymbol);
                braceStack = [];
                continue;
            }
            
            // Check for delegates
            const delegateMatch = line.match(delegatePattern);
            if (delegateMatch && currentSymbol) {
                const delegateParams = delegateMatch[1].trim();
                const delegateSymbol = new vscode.DocumentSymbol(
                    'delegate',
                    delegateParams ? `(${delegateParams})` : '',
                    vscode.SymbolKind.Function,
                    lineRange,
                    lineRange
                );
                
                currentSymbol.children.push(delegateSymbol);
                continue;
            }
            
            // Check for structs
            const structMatch = line.match(structPattern);
            if (structMatch) {
                const structName = structMatch[1] || 'anonymous';
                const structSymbol = new vscode.DocumentSymbol(
                    structName,
                    'Structure',
                    vscode.SymbolKind.Struct,
                    lineRange,
                    lineRange
                );

                // Always add structs to the top level symbols array
                // unless explicitly inside a function/method/event handler
                if (currentSymbol && 
                    (currentSymbol.kind === vscode.SymbolKind.Function ||
                     currentSymbol.kind === vscode.SymbolKind.Method ||
                     currentSymbol.kind === vscode.SymbolKind.Event)) {
                    currentSymbol.children.push(structSymbol);
                } else {
                    symbols.push(structSymbol);
                }

                parentSymbolStack.push(currentSymbol);  // remember our parent
                currentStructOrEnum = structSymbol;     // for member parsing
                if (line.includes('{')) { braceStack.push(i); }
                continue;
            }

            // Check for struct declarations where the opening brace is on the next line
            const structStartMatch = line.match(structStartPattern);
            if (structStartMatch) {
                const structName = structStartMatch[1] || 'anonymous';
                const structSymbol = new vscode.DocumentSymbol(
                    structName,
                    'Structure',
                    vscode.SymbolKind.Struct,
                    lineRange,
                    lineRange
                );
                
                // Always add structs to the top level symbols array
                // unless explicitly inside a function/method/event handler
                if (currentSymbol && 
                    (currentSymbol.kind === vscode.SymbolKind.Function ||
                     currentSymbol.kind === vscode.SymbolKind.Method ||
                     currentSymbol.kind === vscode.SymbolKind.Event)) {
                    currentSymbol.children.push(structSymbol);
                } else {
                    symbols.push(structSymbol);
                }
                
                parentSymbolStack.push(currentSymbol);
                currentSymbol = structSymbol;
                currentStructOrEnum = structSymbol;
                continue;
            }

            // Check for enum declarations where the opening brace is on the next line
            const enumStartMatch = line.match(enumStartPattern);
            if (enumStartMatch) {
                const enumName = enumStartMatch[1] || 'anonymous';
                const enumSymbol = new vscode.DocumentSymbol(
                    enumName,
                    'Enumeration',
                    vscode.SymbolKind.Enum,
                    lineRange,
                    lineRange
                );

                // Always add enums to the top level symbols array
                // unless explicitly inside a function/method/event handler
                if (currentSymbol && 
                    (currentSymbol.kind === vscode.SymbolKind.Function ||
                     currentSymbol.kind === vscode.SymbolKind.Method ||
                     currentSymbol.kind === vscode.SymbolKind.Event)) {
                    currentSymbol.children.push(enumSymbol);
                } else {
                    symbols.push(enumSymbol);
                }

                parentSymbolStack.push(currentSymbol);
                currentSymbol = enumSymbol;
                currentStructOrEnum = enumSymbol;   // enable enum‑member parsing
                braceStack = [];                   // fresh scope for this enum
                continue;
            }
            
            // Check for struct with variable declaration in one line
            const structWithVarMatch = line.match(structWithVarPattern);
            if (structWithVarMatch) {
                // Get struct type name and variable name
                const structTypeName = structWithVarMatch[1] || 'anonymous';
                const varName = structWithVarMatch[2];
                
                // Create struct type symbol if it has a name
                if (structTypeName !== 'anonymous') {
                    const structTypeSymbol = new vscode.DocumentSymbol(
                        structTypeName,
                        'Structure Type',
                        vscode.SymbolKind.Struct,
                        lineRange,
                        lineRange
                    );
                    symbols.push(structTypeSymbol);
                }
                
                // Create variable symbol of the struct type
                const structVarSymbol = new vscode.DocumentSymbol(
                    varName,
                    `${structTypeName} Instance`,
                    vscode.SymbolKind.Variable,
                    lineRange,
                    lineRange
                );
                symbols.push(structVarSymbol);
                continue;
            }
            
            // Check for struct variable declaration
            const structVarMatch = line.match(structVarPattern);
            if (structVarMatch) {
                const structTypeName = structVarMatch[1];
                const varName = structVarMatch[2];
                
                const structVarSymbol = new vscode.DocumentSymbol(
                    varName,
                    `${structTypeName} Instance`,
                    vscode.SymbolKind.Variable,
                    lineRange,
                    lineRange
                );
                
                // If we're inside a function/struct, add as a child, otherwise add as top-level
                if (currentSymbol && braceStack.length > 0) {
                    currentSymbol.children.push(structVarSymbol);
                } else {
                    symbols.push(structVarSymbol);
                }
                continue;
            }
            
            // Check for enums
            const enumMatch = line.match(enumPattern);
            if (enumMatch) {
                const enumName = enumMatch[1] || 'anonymous';
                const enumSymbol = new vscode.DocumentSymbol(
                    enumName,
                    'Enumeration',
                    vscode.SymbolKind.Enum,
                    lineRange,
                    lineRange
                );

                // Always add enums to the top level symbols array
                // unless explicitly inside a function/method/event handler
                if (currentSymbol && 
                    (currentSymbol.kind === vscode.SymbolKind.Function ||
                     currentSymbol.kind === vscode.SymbolKind.Method ||
                     currentSymbol.kind === vscode.SymbolKind.Event)) {
                    currentSymbol.children.push(enumSymbol);
                } else {
                    symbols.push(enumSymbol);
                }

                parentSymbolStack.push(currentSymbol);
                currentSymbol = enumSymbol;
                currentStructOrEnum = enumSymbol;   // enable enum‑member parsing
                braceStack = [];                   // fresh scope for this enum
                continue;
            }
            
            // Check for classes
            const classMatch = line.match(classPattern);
            if (classMatch) {
                const className = classMatch[1];
                const baseClass = classMatch[2] || '';
                const classSymbol = new vscode.DocumentSymbol(
                    className,
                    baseClass ? `Class extends ${baseClass}` : 'Class',
                    vscode.SymbolKind.Class,
                    lineRange,
                    lineRange
                );
                
                currentSymbol = classSymbol;
                symbols.push(classSymbol);
                braceStack = [];
                continue;
            }
            
            // Check for enum members inside enum blocks
            if (currentStructOrEnum && currentStructOrEnum.kind === vscode.SymbolKind.Enum && braceStack.length > 0) {
                const enumMemberMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=.*?)?(?:,|$|\s*(?=\/\/)|\s*$)/);
                if (enumMemberMatch) {
                    const enumMemberName = enumMemberMatch[1];
                    const enumMemberSymbol = new vscode.DocumentSymbol(
                        enumMemberName,
                        'Enum Member',
                        vscode.SymbolKind.EnumMember,
                        lineRange,
                        lineRange
                    );
                    
                    currentStructOrEnum.children.push(enumMemberSymbol);
                    continue;
                }
            }
            
            // Check for struct members inside struct blocks
            if (currentStructOrEnum && currentStructOrEnum.kind === vscode.SymbolKind.Struct && braceStack.length > 0) {
                // Check for nested struct type references
                const structTypeRefMatch = line.match(/^\s*struct\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;\s*$/);
                if (structTypeRefMatch) {
                    const structTypeName = structTypeRefMatch[1];
                    const structMemberName = structTypeRefMatch[2];
                    const structMemberSymbol = new vscode.DocumentSymbol(
                        structMemberName,
                        `struct ${structTypeName}`,
                        vscode.SymbolKind.Field,
                        lineRange,
                        lineRange
                    );
                    currentStructOrEnum.children.push(structMemberSymbol);
                    continue;
                }
                
                // Array member inside struct
                const structMemberArrayMatch = line.match(/^\s*(int|float|byte|word|dword|char|long|int64|qword|double|string|struct\s+[a-zA-Z_][a-zA-Z0-9_]*|enum\s+[a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\[(.+)\]\s*(?:=.*)?;/);
                if (structMemberArrayMatch) {
                    const structMemberType = structMemberArrayMatch[1];
                    const structMemberName = structMemberArrayMatch[2];
                    const arraySize = structMemberArrayMatch[3];
                    const structMemberSymbol = new vscode.DocumentSymbol(
                        structMemberName,
                        `${structMemberType}[${arraySize}]`,
                        vscode.SymbolKind.Array,
                        lineRange,
                        lineRange
                    );
                    currentStructOrEnum.children.push(structMemberSymbol);
                    continue;
                }
                // Non-array field inside struct
                const structMemberMatch = line.match(/^\s*(int|float|byte|word|dword|char|long|int64|qword|double|string|struct\s+[a-zA-Z_][a-zA-Z0-9_]*|enum\s+[a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=.*)?;/);
                if (structMemberMatch) {
                    const structMemberType = structMemberMatch[1];
                    const structMemberName = structMemberMatch[2];
                    const structMemberSymbol = new vscode.DocumentSymbol(
                        structMemberName,
                        structMemberType,
                        vscode.SymbolKind.Field,
                        lineRange,
                        lineRange
                    );
                    currentStructOrEnum.children.push(structMemberSymbol);
                    continue;
                }
            }
            
            // Check for constants
            const constMatch = line.match(constPattern);
            if (constMatch) {
                const constType = constMatch[1];
                const constName = constMatch[2];
                const constSymbol = new vscode.DocumentSymbol(
                    constName,
                    `const ${constType}`,
                    vscode.SymbolKind.Constant,
                    lineRange,
                    lineRange
                );
                
                if (
                    currentSymbol &&
                    (
                        braceStack.length > 0 ||
                        currentSymbol.kind === vscode.SymbolKind.Function ||
                        currentSymbol.kind === vscode.SymbolKind.Method  ||
                        currentSymbol.kind === vscode.SymbolKind.Event
                    )
                ) {
                    currentSymbol.children.push(constSymbol);
                } else {
                    symbols.push(constSymbol);
                }
                continue;
            }

            // Check for variables
            const variableMatch = line.match(variablePattern);
            if (variableMatch) {
                const variableType = variableMatch[1];
                const variableNames = variableMatch[2].split(',').map(name => name.trim());
                
                for (const variableName of variableNames) {
                    const variableSymbol = new vscode.DocumentSymbol(
                        variableName,
                        variableType,
                        vscode.SymbolKind.Variable,
                        lineRange,
                        lineRange
                    );
                    
                    if (
                        currentSymbol &&
                        (
                            braceStack.length > 0 ||
                            currentSymbol.kind === vscode.SymbolKind.Function ||
                            currentSymbol.kind === vscode.SymbolKind.Method  ||
                            currentSymbol.kind === vscode.SymbolKind.Event
                        )
                    ) {
                        currentSymbol.children.push(variableSymbol);
                    } else {
                        symbols.push(variableSymbol);
                    }
                }
                continue;
            }
            
            // Check for message declarations
            const messageMatch = line.match(messageDeclarationPattern);
            if (messageMatch) {
                const messageName = messageMatch[1];
                const messageSymbol = new vscode.DocumentSymbol(
                    messageName,
                    'message',
                    vscode.SymbolKind.Object,
                    lineRange,
                    lineRange
                );
                
                // If we're inside a function/struct, add as a child, otherwise add as top-level
                if (currentSymbol && braceStack.length > 0) {
                    currentSymbol.children.push(messageSymbol);
                } else {
                    symbols.push(messageSymbol);
                }
                continue;
            }
            
            // Check for arrays
            const arrayMatch = line.match(arrayDeclarationPattern);
            if (arrayMatch) {
                const arrayType = arrayMatch[1];
                const arrayName = arrayMatch[2];
                // Extract the array size from the declaration
                const arraySizeMatch = line.match(/\s*\[(.*?)\]/);
                const arraySize = arraySizeMatch ? arraySizeMatch[1] : '';
                
                const arraySymbol = new vscode.DocumentSymbol(
                    arrayName,
                    `${arrayType}[${arraySize}]`,
                    vscode.SymbolKind.Array,
                    lineRange,
                    lineRange
                );
                
                if (
                    currentSymbol &&
                    (
                        braceStack.length > 0 ||
                        currentSymbol.kind === vscode.SymbolKind.Function ||
                        currentSymbol.kind === vscode.SymbolKind.Method  ||
                        currentSymbol.kind === vscode.SymbolKind.Event
                    )
                ) {
                    currentSymbol.children.push(arraySymbol);
                } else {
                    symbols.push(arraySymbol);
                }
                continue;
            }
            
            // Check for associative arrays
            const associativeArrayMatch = line.match(associativeArrayPattern);
            if (associativeArrayMatch) {
                const arrayType = associativeArrayMatch[1];
                const arrayName = associativeArrayMatch[2];
                const keyType = associativeArrayMatch[3];
                const arraySymbol = new vscode.DocumentSymbol(
                    arrayName,
                    `${arrayType}[${keyType}]`,
                    vscode.SymbolKind.Array,
                    lineRange,
                    lineRange
                );
                
                if (
                    currentSymbol &&
                    (
                        braceStack.length > 0 ||
                        currentSymbol.kind === vscode.SymbolKind.Function ||
                        currentSymbol.kind === vscode.SymbolKind.Method  ||
                        currentSymbol.kind === vscode.SymbolKind.Event
                    )
                ) {
                    currentSymbol.children.push(arraySymbol);
                } else {
                    symbols.push(arraySymbol);
                }
                continue;
            }
            
            
            // Check for IP address declarations
            const ipAddressMatch = line.match(ipAddressPattern);
            if (ipAddressMatch) {
                const ipAddress = ipAddressMatch[1];
                const ipAddressSymbol = new vscode.DocumentSymbol(
                    ipAddress,
                    'IP_Address',
                    vscode.SymbolKind.Variable,
                    lineRange,
                    lineRange
                );
                
                if (
                    currentSymbol &&
                    (
                        braceStack.length > 0 ||
                        currentSymbol.kind === vscode.SymbolKind.Function ||
                        currentSymbol.kind === vscode.SymbolKind.Method  ||
                        currentSymbol.kind === vscode.SymbolKind.Event
                    )
                ) {
                    currentSymbol.children.push(ipAddressSymbol);
                } else {
                    symbols.push(ipAddressSymbol);
                }
                continue;
            }
            
            // Check for IP endpoint declarations
            const ipEndpointMatch = line.match(ipEndpointPattern);
            if (ipEndpointMatch) {
                const ipEndpoint = ipEndpointMatch[1];
                const ipEndpointSymbol = new vscode.DocumentSymbol(
                    ipEndpoint,
                    'IP_Endpoint',
                    vscode.SymbolKind.Variable,
                    lineRange,
                    lineRange
                );
                
                if (
                    currentSymbol &&
                    (
                        braceStack.length > 0 ||
                        currentSymbol.kind === vscode.SymbolKind.Function ||
                        currentSymbol.kind === vscode.SymbolKind.Method  ||
                        currentSymbol.kind === vscode.SymbolKind.Event
                    )
                ) {
                    currentSymbol.children.push(ipEndpointSymbol);
                } else {
                    symbols.push(ipEndpointSymbol);
                }
                continue;
            }
            
            // Check for Ethernet channel declarations
            const ethChannelMatch = line.match(ethChannelPattern);
            if (ethChannelMatch) {
                const ethChannel = ethChannelMatch[1];
                const ethChannelSymbol = new vscode.DocumentSymbol(
                    `Eth${ethChannel}`,
                    'Ethernet Channel',
                    vscode.SymbolKind.Variable,
                    lineRange,
                    lineRange
                );
                
                if (
                    currentSymbol &&
                    (
                        braceStack.length > 0 ||
                        currentSymbol.kind === vscode.SymbolKind.Function ||
                        currentSymbol.kind === vscode.SymbolKind.Method  ||
                        currentSymbol.kind === vscode.SymbolKind.Event
                    )
                ) {
                    currentSymbol.children.push(ethChannelSymbol);
                } else {
                    symbols.push(ethChannelSymbol);
                }
                continue;
            }
            
            // Track braces to update the range of the current function/event/struct/enum
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;
            
            for (let j = 0; j < openBraces; j++) {
                braceStack.push(i);
            }
            
            for (let j = 0; j < closeBraces; j++) {
                if (braceStack.length > 0) {
                    const openBraceLine = braceStack.pop();
                    
                    // If we've closed the outermost brace and we have a current symbol
                    if (braceStack.length === 0 && currentSymbol) {
                        // Update the range to include the entire body
                        currentSymbol.range = new vscode.Range(
                            currentSymbol.range.start,
                            new vscode.Position(i, lines[i].length)
                        );
                        
                        // Reset current symbols
                        if (currentSymbol === currentStructOrEnum) {
                            currentStructOrEnum = null;
                        }
                        currentSymbol = null;
                    }
                }
            }

            /* ── explicit end‑of‑struct detection with inline var (`} name;`) ─────────────────── */
            const endStructMatch = line.match(/^\s*}\s*([A-Za-z_][A-Za-z0-9_]*)\s*;/);
            if (currentStructOrEnum && endStructMatch) {
                const varName = endStructMatch[1];
                // extend the struct/enum's range to include this line
                currentStructOrEnum.range = new vscode.Range(
                    currentStructOrEnum.range.start,
                    lineRange.end
                );
                // create a variable symbol for the struct instance
                const structVarSymbol = new vscode.DocumentSymbol(
                    varName,
                    `${currentStructOrEnum.name} Instance`,
                    vscode.SymbolKind.Variable,
                    lineRange,
                    lineRange
                );
                // attach to parent or top-level
                const parent = parentSymbolStack.pop() || null;
                if (parent) {
                    parent.children.push(structVarSymbol);
                } else {
                    symbols.push(structVarSymbol);
                }
                // reset current context
                currentStructOrEnum = null;
                currentSymbol = parent;
                continue;
            }
        }
        
        return symbols;
    }
}

// Add a new class for handling definitions
class CaplDefinitionProvider implements vscode.DefinitionProvider {
    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | vscode.LocationLink[] | undefined> {
        // Check if we're on an include file reference first
        const includeLocation = await this.findIncludeFileLocation(document, position);
        if (includeLocation) {
            return includeLocation;
        }

        const symbolUnderCursor = this.getSymbolUnderCursor(document, position);
        if (!symbolUnderCursor) {
            return undefined;
        }

        // Try to find the definition in the current document first
        const definitionInCurrentDoc = await this.findDefinitionInDocument(document, symbolUnderCursor);
        if (definitionInCurrentDoc) {
            return definitionInCurrentDoc;
        }

        // If not found in current document, look for include files
        // Create a new Set to track visited files to prevent circular references
        const visitedFiles = new Set<string>();
        return this.findDefinitionInIncludedFiles(document, symbolUnderCursor, visitedFiles);
    }

    private async findIncludeFileLocation(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Location | undefined> {
        const line = document.lineAt(position.line).text;
        
        // Check for CAPL-style includes: #include "file.can" within includes { ... } block
        // or standard C-style includes: #include "file.h" or #include <file.h>
        const includeMatch = line.match(/#include\s+["<]([^">]+)[">]/);
        if (includeMatch) {
            const filename = includeMatch[1];
            const filenameStart = line.indexOf(filename);
            const filenameEnd = filenameStart + filename.length;
            
            // Check if the cursor is actually on the filename
            if (position.character >= filenameStart && position.character <= filenameEnd) {
                // Try to resolve the path of the included file
                let includeUri: vscode.Uri | undefined;
                
                // First try as a relative path
                const relativePath = path.join(path.dirname(document.uri.fsPath), filename);
                if (fs.existsSync(relativePath)) {
                    includeUri = vscode.Uri.file(relativePath);
                } else {
                    // Search in workspace folders for an exact match
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders) {
                        for (const folder of workspaceFolders) {
                            const potentialPath = path.join(folder.uri.fsPath, filename);
                            if (fs.existsSync(potentialPath)) {
                                includeUri = vscode.Uri.file(potentialPath);
                                break;
                            }
                        }
                    }
                }
                
                if (includeUri) {
                    // Return a location pointing to the start of the file
                    return new vscode.Location(includeUri, new vscode.Position(0, 0));
                }
            }
        }
        
        // Check for an 'includes' block with direct paths without #include syntax
        // CAPL sometimes allows include files to be specified directly within an includes block
        // Example: includes { "file.can" "anotherfile.can" }
        const quotedPathMatch = line.match(/["']([^"']+\.(can|cin|h|inc))["']/);
        if (quotedPathMatch && !line.includes('#include')) {  // Ensure we don't double-match #include statements
            const includedText = document.getText();
            // Check if we're inside an includes block
            const includesBlockRegex = /includes\s*\{([\s\S]*?)\}/;
            const includesMatch = includesBlockRegex.exec(includedText);
            
            if (includesMatch && includesMatch[1]) {
                const blockContent = includesMatch[1];
                // The current line must be within this block
                const blockStart = document.positionAt(includesMatch.index);
                const blockEnd = document.positionAt(includesMatch.index + includesMatch[0].length);
                
                if (position.line > blockStart.line && position.line < blockEnd.line) {
                    const filename = quotedPathMatch[1];
                    const filenameStart = line.indexOf(filename);
                    const filenameEnd = filenameStart + filename.length;
                    
                    // Check if the cursor is actually on the filename
                    if (position.character >= filenameStart && position.character <= filenameEnd) {
                        // Try to resolve the path of the included file
                        let includeUri: vscode.Uri | undefined;
                        
                        // First try as a relative path
                        const relativePath = path.join(path.dirname(document.uri.fsPath), filename);
                        if (fs.existsSync(relativePath)) {
                            includeUri = vscode.Uri.file(relativePath);
                        } else {
                            // Search in workspace folders for an exact match
                            const workspaceFolders = vscode.workspace.workspaceFolders;
                            if (workspaceFolders) {
                                for (const folder of workspaceFolders) {
                                    const potentialPath = path.join(folder.uri.fsPath, filename);
                                    if (fs.existsSync(potentialPath)) {
                                        includeUri = vscode.Uri.file(potentialPath);
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (includeUri) {
                            // Return a location pointing to the start of the file
                            return new vscode.Location(includeUri, new vscode.Position(0, 0));
                        }
                    }
                }
            }
        }
        
        return undefined;
    }

    private getSymbolUnderCursor(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        // Get the word at the position
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }
        
        const word = document.getText(wordRange);
        
        // Check for empty word or known keywords
        if (!word || word.length === 0 || this.isKeyword(word)) {
            return undefined;
        }
        
        // Verify this is likely a symbol reference
        if (this.isLikelySymbolReference(document, position, word)) {
            return word;
        }
        
        return undefined;
    }

    private isKeyword(word: string): boolean {
        const caplKeywords = [
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 
            'continue', 'return', 'void', 'int', 'float', 'byte', 'word', 'dword', 
            'char', 'long', 'int64', 'qword', 'double', 'string', 'timer', 'msTimer', 
            'message', 'const', 'static', 'extern', 'this', 'sizeof', 'true', 'false',
            'on', 'testcase', 'testfunction'
        ];
        
        return caplKeywords.includes(word);
    }

    private isLikelySymbolReference(document: vscode.TextDocument, position: vscode.Position, word: string): boolean {
        const lineText = document.lineAt(position.line).text;
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return false;
        }
        
        const wordStartIndex = wordRange.start.character;
        const wordEndIndex = wordRange.end.character;
        
        // Check if this is a function call (has parentheses after it)
        if (wordEndIndex < lineText.length && lineText[wordEndIndex] === '(') {
            return true;
        }
        
        // Check if this is a member access (preceded by . or ->)
        if (wordStartIndex > 0 && 
            (lineText.substring(wordStartIndex - 2, wordStartIndex) === '->' || 
             lineText[wordStartIndex - 1] === '.')) {
            return true;
        }
        
        // Check if this is an array access (followed by [)
        if (wordEndIndex < lineText.length && lineText[wordEndIndex] === '[') {
            return true;
        }
        
        // Check if this looks like a variable use in an expression
        const beforeChar = wordStartIndex > 0 ? lineText[wordStartIndex - 1] : '';
        const afterChar = wordEndIndex < lineText.length ? lineText[wordEndIndex] : '';
        
        const operatorsBefore = [' ', '+', '-', '*', '/', '%', '=', '!', '<', '>', '&', '|', '^', '(', ',', '?', ':'];
        const operatorsAfter = [' ', '+', '-', '*', '/', '%', '=', '!', '<', '>', '&', '|', '^', ')', ',', ';', '?', ':'];
        
        if (operatorsBefore.includes(beforeChar) && operatorsAfter.includes(afterChar)) {
            return true;
        }
        
        // Check if this is at the beginning of a line or if it follows a preprocessor directive
        if (wordStartIndex === 0 || lineText.trim().startsWith('#')) {
            return true;
        }
        
        return false;
    }

    private async findDefinitionInDocument(
        document: vscode.TextDocument, 
        symbolName: string
    ): Promise<vscode.Location | undefined> {
        const text = document.getText();
        
        // Pattern to find function definitions with standard, enum, and struct return types
        const functionDefPattern = new RegExp(
            `(void|int|float|byte|word|dword|char|long|int64|qword|double|string|enum\\s+[a-zA-Z_][a-zA-Z0-9_]*|struct\\s+[a-zA-Z_][a-zA-Z0-9_]*)\\s+${symbolName}\\s*\\(`, 
            'g'
        );
        
        // Pattern to find testcase definitions
        const testcaseDefPattern = new RegExp(`testcase\\s+${symbolName}\\s*\\(`, 'g');
        
        // Pattern to find testfunction definitions
        const testfunctionDefPattern = new RegExp(`testfunction\\s+${symbolName}\\s*\\(`, 'g');
        
        // Pattern to find struct definitions
        const structDefPattern = new RegExp(`struct\\s+${symbolName}\\s*{`, 'g');
        
        // Pattern to find struct definitions with opening brace on next line
        const structDefNextLinePattern = new RegExp(`struct\\s+${symbolName}\\s*$`, 'gm');
        
        // Pattern to find enum definitions
        const enumDefPattern = new RegExp(`enum\\s+${symbolName}\\s*{`, 'g');
        
        // Pattern to find enum definitions with opening brace on next line
        const enumDefNextLinePattern = new RegExp(`enum\\s+${symbolName}\\s*$`, 'gm');
        
        // Pattern to find class definitions
        const classDefPattern = new RegExp(`class\\s+${symbolName}\\s*(?:extends\\s+[a-zA-Z_][a-zA-Z0-9_]*\\s*)?{`, 'g');
        
        // Pattern to find class definitions with opening brace on next line
        const classDefNextLinePattern = new RegExp(`class\\s+${symbolName}\\s*(?:extends\\s+[a-zA-Z_][a-zA-Z0-9_]*)?\\s*$`, 'gm');
        
        // Pattern to find variable declarations
        const varDefPattern = new RegExp(
            `(?:static|extern|const|unsigned|signed|volatile)?\\s*(int|float|byte|word|dword|char|long|int64|qword|double|string|timer|msTimer|message|FRFrame|FRPDU|linFrame|a429word|diagRequest|diagResponse|J1587Message|J1587Param|ethernetPacket)\\s+(?:[a-zA-Z_][a-zA-Z0-9_]*,\\s*)*${symbolName}(?:\\s*,\\s*[a-zA-Z_][a-zA-Z0-9_]*)*\\s*(?:\\[.*\\])?\\s*(?:=.*)?;`, 
            'g'
        );
        
        // Pattern to find struct variable declarations
        const structVarDefPattern = new RegExp(
            `struct\\s+[a-zA-Z_][a-zA-Z0-9_]*\\s+(?:[a-zA-Z_][a-zA-Z0-9_]*,\\s*)*${symbolName}(?:\\s*,\\s*[a-zA-Z_][a-zA-Z0-9_]*)*\\s*(?:=.*)?;`, 
            'g'
        );
        
        // Pattern to find function parameters
        const parameterDefPattern = new RegExp(
            `(?:void|int|float|byte|word|dword|char|long|int64|qword|double|string|struct\\s+[a-zA-Z_][a-zA-Z0-9_]*)\\s+${symbolName}\\s*(?:,|\\))`, 
            'g'
        );
        
        // Try to find the definition using various patterns
        const patterns = [
            functionDefPattern, 
            testcaseDefPattern,
            testfunctionDefPattern,
            structDefPattern,
            structDefNextLinePattern,
            enumDefPattern,
            enumDefNextLinePattern,
            classDefPattern, 
            classDefNextLinePattern,
            varDefPattern,
            structVarDefPattern,
            parameterDefPattern
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const startPos = document.positionAt(match.index);
                
                // Return the location with the entire line
                return new vscode.Location(
                    document.uri,
                    new vscode.Position(startPos.line, 0)
                );
            }
        }
        
        // Check for event handlers
        const eventHandlerPatterns = [
            new RegExp(`on\\s+${symbolName}\\s*{`, 'g'),                      // on message
            new RegExp(`on\\s+timer\\s+${symbolName}\\s*{`, 'g'),             // on timer
            new RegExp(`on\\s+key\\s+${symbolName}\\s*{`, 'g'),               // on key
            new RegExp(`on\\s+sysvar\\s+${symbolName}\\s*{`, 'g'),            // on sysvar
            new RegExp(`on\\s+error\\s+${symbolName}\\s*{`, 'g'),             // on error
            new RegExp(`on\\s+J1587Message\\s+${symbolName}\\s*{`, 'g'),      // on J1587Message
            new RegExp(`on\\s+J1587Param\\s+${symbolName}\\s*{`, 'g'),        // on J1587Param
            new RegExp(`on\\s+J1587ErrorMessage\\s+${symbolName}\\s*{`, 'g'), // on J1587ErrorMessage
            new RegExp(`on\\s+ethernetPacket\\s+${symbolName}\\s*{`, 'g'),    // on ethernetPacket
            new RegExp(`on\\s+ethernetErrorPacket\\s+${symbolName}\\s*{`, 'g'),   // on ethernetErrorPacket
            new RegExp(`on\\s+ethLinkStateChange\\s+${symbolName}\\s*{`, 'g')     // on ethLinkStateChange
        ];
        
        for (const pattern of eventHandlerPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const startPos = document.positionAt(match.index);
                
                // Return the location with the entire line
                return new vscode.Location(
                    document.uri,
                    new vscode.Position(startPos.line, 0)
                );
            }
        }
        
        // Check for enum values and find the containing enum
        // First, check if this is an enum value (member)
        const enumValuePattern = new RegExp(`\\b${symbolName}\\s*(?:=.*?)?(?:,|$|\\s*(?://|/\\*))`, 'gm');
        let enumValueMatch;
        
        while ((enumValueMatch = enumValuePattern.exec(text)) !== null) {
            const valuePos = document.positionAt(enumValueMatch.index);
            const valueLine = valuePos.line;
            
            // Search backwards to find the containing enum declaration
            let braceCount = 0;
            let enumFound = false;
            
            for (let line = valueLine; line >= 0; line--) {
                const lineText = document.lineAt(line).text.trim();
                
                // Count braces to track nesting
                braceCount += (lineText.match(/{/g) || []).length;
                braceCount -= (lineText.match(/}/g) || []).length;
                
                // Check for enum declaration with opening brace
                const enumDeclPattern = /enum\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*{/;
                const enumMatch = lineText.match(enumDeclPattern);
                
                if (enumMatch) {
                    // Found named enum declaration
                    enumFound = true;
                    return new vscode.Location(
                        document.uri,
                        new vscode.Position(line, 0)
                    );
                }
                
                // Check for enum declaration with opening brace on the next line
                const enumDeclNextLinePattern = /enum\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/;
                const enumNextLineMatch = lineText.match(enumDeclNextLinePattern);
                
                if (enumNextLineMatch) {
                    // Found named enum declaration with brace on next line
                    enumFound = true;
                    return new vscode.Location(
                        document.uri,
                        new vscode.Position(line, 0)
                    );
                }
                
                // Check for anonymous enum
                if (lineText.match(/enum\s*{/)) {
                    // Found anonymous enum
                    enumFound = true;
                    return new vscode.Location(
                        document.uri,
                        new vscode.Position(line, 0)
                    );
                }
                
                // If we find a closing brace followed by an enum type variable declaration
                if (lineText.match(/}\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*;/) && braceCount < 0) {
                    // We've exited the enum scope, stop searching
                    break;
                }
                
                // If we find a semicolon at the top level, we're likely outside any enum
                if (lineText.endsWith(';') && braceCount <= 0) {
                    break;
                }
            }
        }
        
        return undefined;
    }

    private async findDefinitionInIncludedFiles(
        document: vscode.TextDocument, 
        symbolName: string,
        visitedFiles: Set<string> = new Set()
    ): Promise<vscode.Definition | undefined> {
        // Add current file to visited files to prevent circular includes
        const currentFilePath = document.uri.fsPath;
        if (visitedFiles.has(currentFilePath)) {
            return undefined;
        }
        visitedFiles.add(currentFilePath);
        
        // Find include statements in the document
        // First look for CAPL-specific includes block
        const includesBlockPattern = /includes\s*{([^}]*)}/s;
        const documentText = document.getText();
        const includedFiles: string[] = [];
        
        // Check for CAPL includes block
        const includesBlockMatch = includesBlockPattern.exec(documentText);
        if (includesBlockMatch) {
            const includesBlockContent = includesBlockMatch[1];
            // Find all #include statements inside the includes block
            const includePattern = /#include\s+["<]([^">]+)[">]/g;
            let includeMatch;
            while ((includeMatch = includePattern.exec(includesBlockContent)) !== null) {
                includedFiles.push(includeMatch[1]);
            }
        } else {
            // Fallback to standard C-style includes if no includes block is found
            const standardIncludePattern = /^#include\s+["<]([^">]+)[">]/gm;
            let match;
            while ((match = standardIncludePattern.exec(documentText)) !== null) {
                includedFiles.push(match[1]);
            }
        }
        
        // Search in each included file
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return undefined;
        }
        
        for (const includeFile of includedFiles) {
            // Try to resolve the path of the included file
            let includeUri: vscode.Uri | undefined;
            
            // First try as a relative path
            const relativePath = path.join(path.dirname(document.uri.fsPath), includeFile);
            if (fs.existsSync(relativePath)) {
                includeUri = vscode.Uri.file(relativePath);
            } else {
                // Search in workspace folders for an exact match
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders) {
                    for (const folder of workspaceFolders) {
                        const potentialPath = path.join(folder.uri.fsPath, includeFile);
                        if (fs.existsSync(potentialPath)) {
                            includeUri = vscode.Uri.file(potentialPath);
                            break;
                        }
                    }
                }
            }
            
            if (includeUri) {
                try {
                    const includedDocument = await vscode.workspace.openTextDocument(includeUri);
                    
                    // First search in the directly included file
                    const location = await this.findDefinitionInDocument(includedDocument, symbolName);
                    if (location) {
                        return location;
                    }
                    
                    // If not found in direct include, search recursively in its nested includes
                    const nestedLocation = await this.findDefinitionInIncludedFiles(includedDocument, symbolName, visitedFiles);
                    if (nestedLocation) {
                        return nestedLocation;
                    }
                } catch (error) {
                    console.error(`Error opening included file: ${includeFile}`, error);
                }
            }
        }
        
        return undefined;
    }
} 