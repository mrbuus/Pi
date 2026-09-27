"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/kit/card";
import { Button } from "@/components/ui/kit/button";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
import type { DueResponse } from "./types";

export default function ReviewDueCard() {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{
    tick: number;
    count?: number;
    error?: string;
  }>();
  useEffect(() => {
    let alive = true;
    api<DueResponse>("/formulas/review/due?limit=1")
      .then((value) => {
        if (alive) setState({ tick, count: value.dueCount + value.newCount });
      })
      .catch((error) => {
        if (alive)
          setState({
            tick,
            error:
              error instanceof Error
                ? error.message
                : "Давталтын тоог авч чадсангүй.",
          });
      });
    return () => {
      alive = false;
    };
  }, [tick]);
  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="flex items-center gap-2 font-bold">
          <Layers className="h-5 w-5 text-brand" aria-hidden />
          Томьёоны давталт
        </h2>
        {state?.tick !== tick ? (
          <LoadingState rows={2} />
        ) : state.error ? (
          <div className="[&_button]:min-h-11">
            <ErrorState
              message={state.error}
              onRetry={() => setTick((value) => value + 1)}
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-dim">
              {state.count
                ? `Өнөөдөр ${state.count} томьёо давтах боломжтой.`
                : "Өнөөдрийн давталт дууссан байна."}
            </p>
            <Button asChild variant="secondary">
              <Link href="/app/formulas/review">Давталт руу орох</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
