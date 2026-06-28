import { useState, useEffect, useCallback } from "react";
import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

// Global instance — persists across re-renders and strict mode double-invocations
let globalWebContainerInstance: WebContainer | null = null;
let isBooting = false;

interface UseWebContainerProps {
  templateData: TemplateFolder;
}

interface UseWebContaierReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destory: () => void;
}

export const useWebContainer = ({
  templateData,
}: UseWebContainerProps): UseWebContaierReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(
    globalWebContainerInstance // reuse if already booted
  );

  useEffect(() => {
    let mounted = true;

    async function initializeWebContainer() {
      try {
        // Reuse existing instance
        if (globalWebContainerInstance) {
          setInstance(globalWebContainerInstance);
          setIsLoading(false);
          return;
        }

        // Prevent double-boot from React strict mode
        if (isBooting) return;
        isBooting = true;

        const webcontainerInstance = await WebContainer.boot();

        globalWebContainerInstance = webcontainerInstance;
        isBooting = false;

        if (!mounted) return;

        setInstance(webcontainerInstance);
        setIsLoading(false);
      } catch (error) {
        isBooting = false;
        console.error("Failed to initialize WebContainer:", error);
        if (mounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to initialize WebContainer"
          );
          setIsLoading(false);
        }
      }
    }

    initializeWebContainer();

    return () => {
      mounted = false;
      // Don't teardown here — let the global instance persist
    };
  }, []);

  const writeFileSync = useCallback(
    async (path: string, content: string): Promise<void> => {
      if (!instance) {
        throw new Error("WebContainer instance is not available");
      }

      try {
        const pathParts = path.split("/");
        const folderPath = pathParts.slice(0, -1).join("/");

        if (folderPath) {
          await instance.fs.mkdir(folderPath, { recursive: true });
        }

        await instance.fs.writeFile(path, content);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to write file";
        console.error(`Failed to write file at ${path}:`, err);
        throw new Error(`Failed to write file at ${path}: ${errorMessage}`);
      }
    },
    [instance]
  );

  const destory = useCallback(() => {
    if (instance) {
      instance.teardown();
      setInstance(null);
      setServerUrl(null);
      globalWebContainerInstance = null;
      isBooting = false;
    }
  }, [instance]);

  return { serverUrl, isLoading, error, instance, writeFileSync, destory };
};