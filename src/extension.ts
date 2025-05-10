import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register the document symbol provider for CAPL files
    const documentSymbolProvider = new CaplDocumentSymbolProvider();
    const selector = { scheme: 'file', language: 'capl' };
    
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(selector, documentSymbolProvider)
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
        const functionPattern = /^(void|int|float|byte|word|dword|char|long|int64|qword|double|string)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
        
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
                const functionSymbol = new vscode.DocumentSymbol(
                    functionName,
                    returnType,
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
                const testcaseSymbol = new vscode.DocumentSymbol(
                    testcaseName,
                    'Test Case',
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
                const testfunctionSymbol = new vscode.DocumentSymbol(
                    testfunctionName,
                    'Test Function',
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

                const parent =
                    currentSymbol &&
                    (braceStack.length > 0 ||
                     currentSymbol.kind === vscode.SymbolKind.Function ||
                     currentSymbol.kind === vscode.SymbolKind.Method  ||
                     currentSymbol.kind === vscode.SymbolKind.Event)
                        ? currentSymbol
                        : null;

                if (parent) { parent.children.push(structSymbol); }
                else { symbols.push(structSymbol); }

                parentSymbolStack.push(parent);      // remember our parent
                currentStructOrEnum = structSymbol;  // for member parsing
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
                const parent =
                    currentSymbol &&
                    (braceStack.length > 0 ||
                     currentSymbol.kind === vscode.SymbolKind.Function ||
                     currentSymbol.kind === vscode.SymbolKind.Method ||
                     currentSymbol.kind === vscode.SymbolKind.Event)
                        ? currentSymbol
                        : null;
                if (parent) {
                    parent.children.push(structSymbol);
                } else {
                    symbols.push(structSymbol);
                }
                parentSymbolStack.push(parent);
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

                // ── attach this enum to its logical parent ──
                const parent =
                    currentStructOrEnum
                    ?? (braceStack.length > 0 ? currentSymbol : null);

                if (parent) { parent.children.push(enumSymbol); }
                else        { symbols.push(enumSymbol); }

                parentSymbolStack.push(parent);
                currentSymbol       = enumSymbol;
                currentStructOrEnum = enumSymbol;   // enable enum‑member parsing
                braceStack          = [];           // to be filled when "{" is seen
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

                // ── attach this enum to its logical parent ──
                const parent =
                    currentStructOrEnum                                 // e.g. inside a struct/enum/class
                    ?? (braceStack.length > 0 ? currentSymbol : null);  // e.g. inside a function/method/event

                if (parent) { parent.children.push(enumSymbol); }
                else        { symbols.push(enumSymbol); }

                parentSymbolStack.push(parent);
                currentSymbol       = enumSymbol;
                currentStructOrEnum = enumSymbol;   // enable enum‑member parsing
                braceStack          = [];           // fresh scope for this enum
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
                const enumMemberMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=.*)?(?:,|$)/);
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
                const arraySymbol = new vscode.DocumentSymbol(
                    arrayName,
                    `${arrayType}[]`,
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