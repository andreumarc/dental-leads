"use client";

import {
  Provider as RadixToastProvider,
  Viewport as RadixToastViewport,
} from "@radix-ui/react-toast";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <RadixToastProvider swipeDirection="right">
      {children}
      <RadixToastViewport
        className="fixed top-0 right-0 flex flex-col gap-2 p-4 w-[390px] max-w-[100vw] z-[100] outline-none list-none m-0"
      />
    </RadixToastProvider>
  );
}
