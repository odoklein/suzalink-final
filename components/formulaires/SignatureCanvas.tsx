"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface SignatureCanvasRef {
  isEmpty(): boolean;
  toDataURL(): string;
  clear(): void;
}

interface Props {
  className?: string;
}

export const SignatureCanvas = forwardRef<SignatureCanvasRef, Props>(
  ({ className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);

    useImperativeHandle(ref, () => ({
      isEmpty() {
        const canvas = canvasRef.current;
        if (!canvas) return true;
        const ctx = canvas.getContext("2d");
        if (!ctx) return true;
        const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        return !Array.from(px).some((v, i) => i % 4 === 3 && v > 0);
      },
      toDataURL() {
        return canvasRef.current?.toDataURL("image/png") ?? "";
      },
      clear() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      };
      resize();

      const pt = (e: MouseEvent | Touch) => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      const start = (e: MouseEvent | TouchEvent) => {
        drawing.current = true;
        const p = pt(e instanceof TouchEvent ? e.touches[0] : e);
        last.current = p;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      };

      const move = (e: MouseEvent | TouchEvent) => {
        if (!drawing.current || !last.current) return;
        e.preventDefault();
        const p = pt(e instanceof TouchEvent ? e.touches[0] : e);
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
      };

      const stop = () => {
        drawing.current = false;
        last.current = null;
      };

      canvas.addEventListener("mousedown", start);
      canvas.addEventListener("mousemove", move);
      canvas.addEventListener("mouseup", stop);
      canvas.addEventListener("mouseleave", stop);
      canvas.addEventListener("touchstart", start, { passive: false });
      canvas.addEventListener("touchmove", move, { passive: false });
      canvas.addEventListener("touchend", stop);

      const ro = new ResizeObserver(resize);
      ro.observe(canvas);

      return () => {
        canvas.removeEventListener("mousedown", start);
        canvas.removeEventListener("mousemove", move);
        canvas.removeEventListener("mouseup", stop);
        canvas.removeEventListener("mouseleave", stop);
        canvas.removeEventListener("touchstart", start);
        canvas.removeEventListener("touchmove", move);
        canvas.removeEventListener("touchend", stop);
        ro.disconnect();
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ touchAction: "none", cursor: "crosshair" }}
      />
    );
  }
);

SignatureCanvas.displayName = "SignatureCanvas";
