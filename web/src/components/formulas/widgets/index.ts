"use client";
import dynamic from "next/dynamic";
import { createElement, type ComponentType } from "react";
import { LoadingState } from "@/components/ui/StateBlock";
function WidgetLoading() {
  return createElement(LoadingState, {
    rows: 3,
    label: "Зургийг бэлтгэж байна",
  });
}
// Each interaction is local state; no requests or interval timers.
export const FORMULA_WIDGETS: Record<string, ComponentType> = {
  "square-of-sum": dynamic(() => import("./square-of-sum"), {
    loading: WidgetLoading,
  }),
  "difference-of-squares": dynamic(() => import("./difference-of-squares"), {
    loading: WidgetLoading,
  }),
  "quadratic-graph": dynamic(() => import("./quadratic-graph"), {
    loading: WidgetLoading,
  }),
  vieta: dynamic(() => import("./vieta"), { loading: WidgetLoading }),
  "abs-graph": dynamic(() => import("./abs-graph"), { loading: WidgetLoading }),
  "exp-graph": dynamic(() => import("./exp-graph"), { loading: WidgetLoading }),
  "log-graph": dynamic(() => import("./log-graph"), { loading: WidgetLoading }),
  "unit-circle": dynamic(() => import("./unit-circle"), {
    loading: WidgetLoading,
  }),
  "sine-graph": dynamic(() => import("./sine-graph"), {
    loading: WidgetLoading,
  }),
  "arith-seq": dynamic(() => import("./arith-seq"), { loading: WidgetLoading }),
  "geom-seq": dynamic(() => import("./geom-seq"), { loading: WidgetLoading }),
  "pascal-triangle": dynamic(() => import("./pascal-triangle"), {
    loading: WidgetLoading,
  }),
  "probability-dice": dynamic(() => import("./probability-dice"), {
    loading: WidgetLoading,
  }),
  "derivative-tangent": dynamic(() => import("./derivative-tangent"), {
    loading: WidgetLoading,
  }),
  "integral-area": dynamic(() => import("./integral-area"), {
    loading: WidgetLoading,
  }),
  pythagoras: dynamic(() => import("./pythagoras"), { loading: WidgetLoading }),
  "triangle-area": dynamic(() => import("./triangle-area"), {
    loading: WidgetLoading,
  }),
  "inscribed-angle": dynamic(() => import("./inscribed-angle"), {
    loading: WidgetLoading,
  }),
  "circle-sector": dynamic(() => import("./circle-sector"), {
    loading: WidgetLoading,
  }),
  "prism-volume": dynamic(() => import("./prism-volume"), {
    loading: WidgetLoading,
  }),
  "cone-cylinder": dynamic(() => import("./cone-cylinder"), {
    loading: WidgetLoading,
  }),
  "vector-add": dynamic(() => import("./vector-add"), {
    loading: WidgetLoading,
  }),
  "line-slope": dynamic(() => import("./line-slope"), {
    loading: WidgetLoading,
  }),
};

export const WIDGET_TITLES: Record<string, string> = {
  "square-of-sum": "Нийлбэрийн квадрат",
  "difference-of-squares": "Квадратуудын ялгавар",
  "quadratic-graph": "Квадрат функц",
  vieta: "Виетийн теорем",
  "abs-graph": "Модульт функц",
  "exp-graph": "Илтгэгч функц",
  "log-graph": "Логарифм функц",
  "unit-circle": "Нэгж тойрог",
  "sine-graph": "Синусын график",
  "arith-seq": "Арифметик прогресс",
  "geom-seq": "Геометр прогресс",
  "pascal-triangle": "Паскалийн гурвалжин",
  "probability-dice": "Магадлал ба шоо",
  "derivative-tangent": "Уламжлал ба шүргэгч",
  "integral-area": "Интегралын талбай",
  pythagoras: "Пифагорын теорем",
  "triangle-area": "Гурвалжны талбай",
  "inscribed-angle": "Багтсан өнцөг",
  "circle-sector": "Дугуйн сектор",
  "prism-volume": "Призмийн эзлэхүүн",
  "cone-cylinder": "Конус ба цилиндр",
  "vector-add": "Векторуудын нийлбэр",
  "line-slope": "Шулууны налалт",
};
