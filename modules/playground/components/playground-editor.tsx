"use client"

import { useRef, useEffect, useCallback } from "react"
import Editor, { type Monaco } from "@monaco-editor/react"
import { TemplateFile } from "../lib/path-to-json"
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from "../lib/editor-config"


interface PlaygroundEditorProps {
  activeFile: TemplateFile | undefined
  content: string
  onContentChange: (value: string) => void
  suggestion: string | null
  suggestionLoading: boolean
  suggestionPosition: { line: number; column: number } | null
  onAcceptSuggestion: (editor: any, monaco: any) => void
  onRejectSuggestion: (editor: any) => void
  onTriggerSuggestion: (type: string, editor: any) => void
}

export const PlaygroundEditor = ({
  activeFile,
  content,
  onContentChange,
  suggestion,
  suggestionLoading,
  suggestionPosition,
  onAcceptSuggestion,
  onRejectSuggestion,
  onTriggerSuggestion,
}: PlaygroundEditorProps) => {
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const inlineCompletionProviderRef = useRef<any>(null)
  const currentSuggestionRef = useRef<{
    text: string
    position: { line: number; column: number }
    id: string
  } | null>(null)
  const isAcceptingSuggestionRef = useRef(false)
  const suggestionAcceptedRef = useRef(false)
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tabCommandRef = useRef<any>(null)

  // Refs to keep suggestion in sync without re-registering provider
  const suggestionRef = useRef<string | null>(null)
  const suggestionPositionRef = useRef<{ line: number; column: number } | null>(null)

  // Generate unique ID for each suggestion
  const generateSuggestionId = () => `suggestion-${Date.now()}-${Math.random()}`

  // Keep refs in sync with props
  useEffect(() => {
    suggestionRef.current = suggestion
    suggestionPositionRef.current = suggestionPosition

    if (suggestion && suggestionPosition && editorRef.current) {
      setTimeout(() => {
        if (!isAcceptingSuggestionRef.current && !suggestionAcceptedRef.current) {
          editorRef.current?.trigger("ai", "editor.action.inlineSuggest.trigger", null)
        }
      }, 50)
    }
  }, [suggestion, suggestionPosition])

  // Clear current suggestion
  const clearCurrentSuggestion = useCallback(() => {
    console.log("Clearing current suggestion")
    currentSuggestionRef.current = null
    suggestionAcceptedRef.current = false
    if (editorRef.current) {
      editorRef.current.trigger("ai", "editor.action.inlineSuggest.hide", null)
    }
  }, [])

  // Accept current suggestion with double-acceptance prevention
  const acceptCurrentSuggestion = useCallback(() => {
    if (!editorRef.current || !monacoRef.current || !currentSuggestionRef.current) {
      console.log("Cannot accept suggestion - missing refs")
      return false
    }

    if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
      console.log("BLOCKED: Already accepting/accepted suggestion, skipping")
      return false
    }

    isAcceptingSuggestionRef.current = true
    suggestionAcceptedRef.current = true

    const editor = editorRef.current
    const monaco = monacoRef.current
    const currentSuggestion = currentSuggestionRef.current

    try {
      const cleanSuggestionText = currentSuggestion.text.replace(/\r/g, "")

      const currentPosition = editor.getPosition()
      const suggestionPos = currentSuggestion.position

      if (
        currentPosition.lineNumber !== suggestionPos.line ||
        currentPosition.column < suggestionPos.column ||
        currentPosition.column > suggestionPos.column + 5
      ) {
        console.log("Position changed, cannot accept suggestion")
        return false
      }

      const range = new monaco.Range(suggestionPos.line, suggestionPos.column, suggestionPos.line, suggestionPos.column)

      const success = editor.executeEdits("ai-suggestion-accept", [
        {
          range: range,
          text: cleanSuggestionText,
          forceMoveMarkers: true,
        },
      ])

      if (!success) {
        console.error("Failed to execute edit")
        return false
      }

      const lines = cleanSuggestionText.split("\n")
      const endLine = suggestionPos.line + lines.length - 1
      const endColumn =
        lines.length === 1 ? suggestionPos.column + cleanSuggestionText.length : lines[lines.length - 1].length + 1

      editor.setPosition({ lineNumber: endLine, column: endColumn })

      clearCurrentSuggestion()
      onAcceptSuggestion(editor, monaco)

      return true
    } catch (error) {
      console.error("Error accepting suggestion:", error)
      return false
    } finally {
      isAcceptingSuggestionRef.current = false
      setTimeout(() => {
        suggestionAcceptedRef.current = false
      }, 1000)
    }
  }, [clearCurrentSuggestion, onAcceptSuggestion])

  // Check if there's an active inline suggestion at current position
  const hasActiveSuggestionAtPosition = useCallback(() => {
    if (!editorRef.current || !currentSuggestionRef.current) return false

    const position = editorRef.current.getPosition()
    const suggestion = currentSuggestionRef.current

    return (
      position.lineNumber === suggestion.position.line &&
      position.column >= suggestion.position.column &&
      position.column <= suggestion.position.column + 2
    )
  }, [])

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    editor.updateOptions({
      ...defaultEditorOptions,
      inlineSuggest: {
        enabled: true,
        mode: "prefix",
        suppressSuggestions: false,
      },
      suggest: {
        preview: false,
        showInlineDetails: false,
        insertMode: "replace",
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      cursorSmoothCaretAnimation: "on",
    })

    configureMonaco(monaco)

    // Register inline completion provider ONCE with all required methods
    inlineCompletionProviderRef.current = monaco.languages.registerInlineCompletionsProvider("*", {
      provideInlineCompletions: async (model: any, position: any) => {
        if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
          return { items: [] }
        }

        if (!suggestionRef.current || !suggestionPositionRef.current) {
          return { items: [] }
        }

        const currentLine = position.lineNumber
        const currentColumn = position.column

        const isPositionMatch =
          currentLine === suggestionPositionRef.current.line &&
          currentColumn >= suggestionPositionRef.current.column &&
          currentColumn <= suggestionPositionRef.current.column + 2

        if (!isPositionMatch) {
          return { items: [] }
        }

        const suggestionId = generateSuggestionId()
        currentSuggestionRef.current = {
          text: suggestionRef.current,
          position: suggestionPositionRef.current,
          id: suggestionId,
        }

        const cleanSuggestion = suggestionRef.current.replace(/\r/g, "")

        return {
          items: [
            {
              insertText: cleanSuggestion,
              range: new monaco.Range(
                suggestionPositionRef.current.line,
                suggestionPositionRef.current.column,
                suggestionPositionRef.current.line,
                suggestionPositionRef.current.column,
              ),
              kind: monaco.languages.CompletionItemKind.Snippet,
              label: "AI Suggestion",
              detail: "AI-generated code suggestion",
              documentation: "Press Tab to accept",
              sortText: "0000",
              filterText: "",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
          ],
        }
      },
      freeInlineCompletions: (_completions: any) => {
        console.log("freeInlineCompletions called")
      },
      disposeInlineCompletions: (_completions: any) => {
        console.log("disposeInlineCompletions called")
      },
    })

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      onTriggerSuggestion("completion", editor)
    })

    if (tabCommandRef.current) {
      tabCommandRef.current.dispose()
    }

    tabCommandRef.current = editor.addCommand(
      monaco.KeyCode.Tab,
      () => {
        if (isAcceptingSuggestionRef.current) {
          return
        }

        if (suggestionAcceptedRef.current) {
          editor.trigger("keyboard", "tab", null)
          return
        }

        if (currentSuggestionRef.current && hasActiveSuggestionAtPosition()) {
          const accepted = acceptCurrentSuggestion()
          if (accepted) {
            return
          }
        }

        editor.trigger("keyboard", "tab", null)
      },
      "editorTextFocus && !editorReadonly && !suggestWidgetVisible",
    )

    editor.addCommand(monaco.KeyCode.Escape, () => {
      if (currentSuggestionRef.current) {
        onRejectSuggestion(editor)
        clearCurrentSuggestion()
      }
    })

    editor.onDidChangeCursorPosition((e: any) => {
      if (isAcceptingSuggestionRef.current) return

      const newPosition = e.position

      if (currentSuggestionRef.current && !suggestionAcceptedRef.current) {
        const suggestionPos = currentSuggestionRef.current.position

        if (
          newPosition.lineNumber !== suggestionPos.line ||
          newPosition.column < suggestionPos.column ||
          newPosition.column > suggestionPos.column + 10
        ) {
          clearCurrentSuggestion()
          onRejectSuggestion(editor)
        }
      }

      if (!currentSuggestionRef.current && !suggestionLoading) {
        if (suggestionTimeoutRef.current) {
          clearTimeout(suggestionTimeoutRef.current)
        }

        suggestionTimeoutRef.current = setTimeout(() => {
          onTriggerSuggestion("completion", editor)
        }, 300)
      }
    })

    editor.onDidChangeModelContent((e: any) => {
      if (isAcceptingSuggestionRef.current) return

      if (currentSuggestionRef.current && e.changes.length > 0 && !suggestionAcceptedRef.current) {
        const change = e.changes[0]

        if (
          change.text === currentSuggestionRef.current.text ||
          change.text === currentSuggestionRef.current.text.replace(/\r/g, "")
        ) {
          return
        }

        clearCurrentSuggestion()
      }

      if (e.changes.length > 0 && !suggestionAcceptedRef.current) {
        const change = e.changes[0]

        if (
          change.text === "\n" ||
          change.text === "{" ||
          change.text === "." ||
          change.text === "=" ||
          change.text === "(" ||
          change.text === "," ||
          change.text === ":" ||
          change.text === ";"
        ) {
          setTimeout(() => {
            if (editorRef.current && !currentSuggestionRef.current && !suggestionLoading) {
              onTriggerSuggestion("completion", editor)
            }
          }, 100)
        }
      }
    })

    updateEditorLanguage()
  }

  const updateEditorLanguage = () => {
    if (!activeFile || !monacoRef.current || !editorRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return

    const language = getEditorLanguage(activeFile.fileExtension || "")
    try {
      monacoRef.current.editor.setModelLanguage(model, language)
    } catch (error) {
      console.warn("Failed to set editor language:", error)
    }
  }

  useEffect(() => {
    updateEditorLanguage()
  }, [activeFile])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current)
      }
      if (inlineCompletionProviderRef.current) {
        inlineCompletionProviderRef.current.dispose()
        inlineCompletionProviderRef.current = null
      }
    if (tabCommandRef.current && typeof tabCommandRef.current.dispose === 'function') {
        tabCommandRef.current.dispose()
          tabCommandRef.current = null
}
    }
  }, [])

  return (
    <div className="h-full relative">
      {suggestionLoading && (
        <div className="absolute top-2 right-2 z-10 bg-red-100 dark:bg-red-900 px-2 py-1 rounded text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          AI thinking...
        </div>
      )}

      {currentSuggestionRef.current && !suggestionLoading && (
        <div className="absolute top-2 right-2 z-10 bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Press Tab to accept
        </div>
      )}

      <Editor
        height="100%"
        value={content}
        onChange={(value) => onContentChange(value || "")}
        onMount={handleEditorDidMount}
        language={activeFile ? getEditorLanguage(activeFile.fileExtension || "") : "plaintext"}
        // @ts-ignore
        options={defaultEditorOptions}
      />
    </div>
  )
}
