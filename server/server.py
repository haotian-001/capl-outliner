from pygls.server import LanguageServer
from pygls.lsp.methods import TEXT_DOCUMENT_DID_OPEN, TEXT_DOCUMENT_DID_CHANGE, TEXT_DOCUMENT_DOCUMENT_SYMBOL
from pygls.lsp.types import (DidOpenTextDocumentParams, DidChangeTextDocumentParams,
                             DocumentSymbolParams, DocumentSymbol, SymbolKind, Range, Position)

class CaplLanguageServer(LanguageServer):
    def __init__(self):
        super().__init__('capl-ls')

capl_server = CaplLanguageServer()

# In-memory storage for documents
DOCUMENTS = {}

@capl_server.feature(TEXT_DOCUMENT_DID_OPEN)
def did_open(server: LanguageServer, params: DidOpenTextDocumentParams):
    DOCUMENTS[params.text_document.uri] = params.text_document.text

@capl_server.feature(TEXT_DOCUMENT_DID_CHANGE)
def did_change(server: LanguageServer, params: DidChangeTextDocumentParams):
    text = params.content_changes[0].text
    DOCUMENTS[params.text_document.uri] = text

@capl_server.feature(TEXT_DOCUMENT_DOCUMENT_SYMBOL)
def document_symbol(server: LanguageServer, params: DocumentSymbolParams):
    uri = params.text_document.uri
    text = DOCUMENTS.get(uri, '')
    # Very naive parser: look for lines starting with "on" or functions with return type
    symbols = []
    lines = text.splitlines()
    for idx, line in enumerate(lines):
        if line.strip().startswith('on '):
            name = line.strip().split()[1]
            sym_range = Range(start=Position(line=idx, character=0),
                              end=Position(line=idx, character=len(line)))
            symbols.append(DocumentSymbol(name=name,
                                          kind=SymbolKind.Function,
                                          range=sym_range,
                                          selection_range=sym_range))
    return symbols

if __name__ == '__main__':
    capl_server.start_io()
