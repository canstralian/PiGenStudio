import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, language = "shell", height = "400px", readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Configure Monaco environment
    (window as any).MonacoEnvironment = {
      getWorkerUrl: () => `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/' };
        importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs/base/worker/workerMain.js');
      `)}`
    };

    // Create editor
    editorRef.current = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme: "vs-dark",
      readOnly,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: "Fira Code, Source Code Pro, Monaco, Menlo, Ubuntu Mono, monospace",
      automaticLayout: true,
    });

    // Handle content changes
    const subscription = editorRef.current.onDidChangeModelContent(() => {
      if (editorRef.current && !readOnly) {
        onChange(editorRef.current.getValue());
      }
    });

    return () => {
      subscription.dispose();
      editorRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  return (
    <div 
      ref={containerRef} 
      style={{ height }}
      className="border border-gray-300 rounded-md overflow-hidden"
    />
  );
}
