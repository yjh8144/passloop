import { Check, ChevronRight } from "lucide-react";
import type { PracticeMode, Question } from "../../lib/types";
import { formatAnswer, isAnswerCorrect, typeLabels } from "../../lib/question";
import { AnswerInput } from "./AnswerInput";

type AnswerMap = Record<string, string | string[]>;

export function QuestionCard(props: {
  id?: string;
  index: number;
  question: Question;
  answers: AnswerMap;
  setAnswers: (value: AnswerMap | ((value: AnswerMap) => AnswerMap)) => void;
  result?: boolean;
  submitted: boolean;
  practiceMode: PracticeMode;
  onSubmit: () => void;
  onNext?: () => void;
  compact?: boolean;
  hideSubmit?: boolean;
  revealMode?: "immediate" | "end";
  allSubmitted?: boolean;
}) {
  const showAnswer = props.practiceMode === "memorize"
    || (props.submitted && (props.revealMode !== "end" || !!props.allSubmitted));
  const updateAnswer = (id: string, value: string | string[]) => {
    props.setAnswers((current) => ({ ...current, [id]: value }));
  };
  return (
    <article id={props.id} className={`question-card ${props.compact ? "compact" : ""}`}>
      <div className="question-heading">
        <div>
          <span className="question-type">{typeLabels[props.question.type]}</span>
          <h2>
            {props.index + 1}. {props.question.title}
          </h2>
        </div>
        {props.submitted && (props.revealMode !== "end" || !!props.allSubmitted) && (
          <span className={`result-chip ${props.result ? "correct" : "wrong"}`}>
            {props.result ? "正确" : "错误"}
          </span>
        )}
      </div>
      {props.question.prompt && props.question.prompt !== props.question.title && <p className="prompt-text">{props.question.prompt}</p>}
      {props.question.hint && <div className="hint-box">提示：{props.question.hint}</div>}

      {props.question.type === "composite" ? (
        <div className="subquestion-stack">
          {props.question.subQuestions.length ? (
            props.question.subQuestions.map((subQuestion, index) => (
              <QuestionCard
                key={subQuestion.id}
                index={index}
                question={subQuestion}
                answers={props.answers}
                setAnswers={props.setAnswers}
                submitted={showAnswer}
                result={isAnswerCorrect(subQuestion, props.answers[subQuestion.id] ?? "")}
                practiceMode={props.practiceMode}
                onSubmit={() => undefined}
                compact
              />
            ))
          ) : (
            <textarea
              value={String(props.answers[props.question.id] ?? "")}
              onChange={(event) => updateAnswer(props.question.id, event.target.value)}
              placeholder="输入综合题作答"
            />
          )}
        </div>
      ) : (
        <AnswerInput question={props.question} value={props.answers[props.question.id]} onChange={updateAnswer} practiceMode={props.practiceMode} />
      )}

      {!props.compact && !props.hideSubmit && props.practiceMode !== "memorize" && (
        <div className="question-actions">
          <button className="primary-button" onClick={props.onSubmit}>
            <Check size={17} /> 提交答案
          </button>
          {props.submitted && props.onNext && (
            <button onClick={props.onNext}>
              下一题 <ChevronRight size={17} />
            </button>
          )}
        </div>
      )}

      {!props.compact && props.hideSubmit && props.onNext && (
        <div className="question-actions">
          <button className="primary-button" onClick={props.onNext}>
            下一题 <ChevronRight size={17} />
          </button>
        </div>
      )}

      {showAnswer && (
        <div className="answer-panel">
          <div>
            <strong>答案</strong>
            <p>{formatAnswer(props.question.answer) || "未设置"}</p>
          </div>
          <div>
            <strong>解析</strong>
            <p>{props.question.explanation || "暂无解析"}</p>
          </div>
        </div>
      )}
    </article>
  );
}
