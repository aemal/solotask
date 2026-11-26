"use client";
import { useEffect, useState } from "react";
import type { OwnerQuestion } from "@/lib/questions";
import { elapsedLabel } from "@/lib/question-time";
export function QuestionTimeline({ question }: { question: OwnerQuestion }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const rows = [
    { label: "Question arrived", at: question.createdAt, wait: null },
    { label: "You answered", at: question.answeredAt, wait: elapsedLabel(question.createdAt, question.answeredAt || "") },
    { label: "Agent picked up", at: question.pickedUpAt, wait: elapsedLabel(question.answeredAt, question.pickedUpAt || "") },
    ...(question.status === "resolved" ? [{ label: "Agent acknowledged", at: question.resolvedAt, wait: null }] : []),
  ];
  return <ol className="question-timeline" aria-label="Question timeline">{rows.map(row => {
    const valid = row.at && Number.isFinite(Date.parse(row.at));
    const ago = valid ? elapsedLabel(row.at, now) : null;
    return <li key={row.label}><strong>{row.label}</strong>{valid ? <>
      <time dateTime={row.at!} title={new Date(row.at!).toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" })}>{ago ? `${ago} ago` : "just now"}</time>
      {row.wait && <small>{row.wait} {row.label === "You answered" ? "after question" : "after your answer"}</small>}
    </> : <span>{row.label === "You answered" ? "Awaiting your answer" : row.label === "Agent picked up" ? question.status === "resolved" ? "Pickup time not recorded" : question.answeredAt ? "Awaiting next agent checkpoint" : "After you answer" : "Time not recorded"}</span>}</li>;
  })}</ol>;
}
