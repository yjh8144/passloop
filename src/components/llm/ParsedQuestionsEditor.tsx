import { Plus, Trash2, X } from "lucide-react";
import type { ChoiceOption, Question, QuestionList, QuestionType } from "../../lib/types";
import { createEmptyQuestion, createId, typeLabels } from "../../lib/question";
import { questionTypes } from "../../utils/constants";

export function ParsedQuestionsEditor(props: {
  list: QuestionList;
  readOnly?: boolean;
  onChange: (list: QuestionList) => void;
}) {
  const updateQuestion = (index: number, patch: Partial<Question>) => {
    if (props.readOnly) return;
    const questions = props.list.questions.map((q, i) =>
      i === index ? { ...q, ...patch, updatedAt: new Date().toISOString() } : q,
    );
    props.onChange({ ...props.list, questions, updatedAt: new Date().toISOString() });
  };

  const deleteQuestion = (index: number) => {
    if (props.readOnly) return;
    const questions = props.list.questions.filter((_, i) => i !== index);
    props.onChange({ ...props.list, questions, updatedAt: new Date().toISOString() });
  };

  const addQuestion = () => {
    if (props.readOnly) return;
    const questions = [...props.list.questions, createEmptyQuestion()];
    props.onChange({ ...props.list, questions, updatedAt: new Date().toISOString() });
  };

  const updateOption = (qIndex: number, optIndex: number, patch: Partial<ChoiceOption>) => {
    if (props.readOnly) return;
    const question = props.list.questions[qIndex];
    const options = question.options.map((o, i) => (i === optIndex ? { ...o, ...patch } : o));
    updateQuestion(qIndex, { options });
  };

  const addOption = (qIndex: number) => {
    if (props.readOnly) return;
    const question = props.list.questions[qIndex];
    const nextLabel = String.fromCharCode(65 + question.options.length);
    const options = [...question.options, { id: createId(), label: nextLabel, text: "" }];
    updateQuestion(qIndex, { options });
  };

  const deleteOption = (qIndex: number, optIndex: number) => {
    if (props.readOnly) return;
    const question = props.list.questions[qIndex];
    const options = question.options.filter((_, i) => i !== optIndex);
    updateQuestion(qIndex, { options });
  };

  const updateSubQuestion = (qIndex: number, subIndex: number, patch: Partial<Question>) => {
    if (props.readOnly) return;
    const question = props.list.questions[qIndex];
    const subQuestions = question.subQuestions.map((sq, i) =>
      i === subIndex ? { ...sq, ...patch, updatedAt: new Date().toISOString() } : sq,
    );
    updateQuestion(qIndex, { subQuestions });
  };

  return (
    <div className="parsed-editor-stack">
      {props.list.questions.map((question, qIndex) => (
        <div className="parsed-question-card" key={question.id}>
          <div className="parsed-card-header">
            <span className="parsed-card-index">{qIndex + 1}</span>
            <select
              value={question.type}
              disabled={props.readOnly}
              onChange={(e) => updateQuestion(qIndex, { type: e.target.value as QuestionType })}
            >
              {questionTypes.map((t) => (
                <option key={t} value={t}>{typeLabels[t]}</option>
              ))}
            </select>
            {!props.readOnly && (
              <button className="icon-button danger-icon" title="删除题目" onClick={() => deleteQuestion(qIndex)}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <label className="field-label">
            标题
            <input
              value={question.title}
              disabled={props.readOnly}
              onChange={(e) => updateQuestion(qIndex, { title: e.target.value })}
            />
          </label>
          <label className="field-label">
            题干
            <textarea
              value={question.prompt}
              disabled={props.readOnly}
              onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
            />
          </label>
          {(question.type === "single" || question.type === "multiple") && (
            <div className="parsed-options">
              <div className="parsed-options-header">
                <span className="parsed-options-label">选项</span>
                {!props.readOnly && (
                  <button className="icon-button" title="添加选项" onClick={() => addOption(qIndex)}>
                    <Plus size={14} />
                  </button>
                )}
              </div>
              {question.options.map((option, oIndex) => (
                <div className="parsed-option-row" key={option.id}>
                  <input
                    className="option-label-input"
                    value={option.label}
                    disabled={props.readOnly}
                    onChange={(e) => updateOption(qIndex, oIndex, { label: e.target.value })}
                  />
                  <input
                    value={option.text}
                    disabled={props.readOnly}
                    onChange={(e) => updateOption(qIndex, oIndex, { text: e.target.value })}
                  />
                  {!props.readOnly && (
                    <button className="icon-button danger-icon" title="删除选项" onClick={() => deleteOption(qIndex, oIndex)}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {question.type === "boolean" && (
            <div className="parsed-options">
              <span className="parsed-options-label">选项（判断题固定 T/F）</span>
              <div className="parsed-option-row">
                <input className="option-label-input" value="T" disabled />
                <input value="正确" disabled />
              </div>
              <div className="parsed-option-row">
                <input className="option-label-input" value="F" disabled />
                <input value="错误" disabled />
              </div>
            </div>
          )}
          <label className="field-label">
            答案{(question.type === "multiple" || question.type === "blank") && "（用 | 分隔）"}
            <input
              value={Array.isArray(question.answer) ? question.answer.join("|") : question.answer}
              disabled={props.readOnly}
              onChange={(e) =>
                updateQuestion(qIndex, {
                  answer:
                    question.type === "multiple" || question.type === "blank"
                      ? e.target.value.split("|").map((s) => s.trim()).filter(Boolean)
                      : e.target.value,
                })
              }
            />
          </label>
          <label className="field-label">
            解析
            <textarea
              value={question.explanation}
              disabled={props.readOnly}
              onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
            />
          </label>
          {question.type === "composite" && question.subQuestions.length > 0 && (
            <div className="parsed-subquestions">
              <span className="parsed-options-label">子题</span>
              {question.subQuestions.map((sub, sIndex) => (
                <div className="parsed-subquestion-card" key={sub.id}>
                  <div className="parsed-card-header">
                    <span className="parsed-card-index">{qIndex + 1}.{sIndex + 1}</span>
                    <select
                      value={sub.type}
                      disabled={props.readOnly}
                      onChange={(e) => updateSubQuestion(qIndex, sIndex, { type: e.target.value as QuestionType })}
                    >
                      {questionTypes.map((t) => (
                        <option key={t} value={t}>{typeLabels[t]}</option>
                      ))}
                    </select>
                  </div>
                  <label className="field-label">
                    标题
                    <input
                      value={sub.title}
                      disabled={props.readOnly}
                      onChange={(e) => updateSubQuestion(qIndex, sIndex, { title: e.target.value })}
                    />
                  </label>
                  <label className="field-label">
                    答案
                    <input
                      value={Array.isArray(sub.answer) ? sub.answer.join("|") : sub.answer}
                      disabled={props.readOnly}
                      onChange={(e) =>
                        updateSubQuestion(qIndex, sIndex, {
                          answer:
                            sub.type === "multiple" || sub.type === "blank"
                              ? e.target.value.split("|").map((s) => s.trim()).filter(Boolean)
                              : e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="field-label">
                    解析
                    <textarea
                      value={sub.explanation}
                      disabled={props.readOnly}
                      onChange={(e) => updateSubQuestion(qIndex, sIndex, { explanation: e.target.value })}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {!props.readOnly && (
        <button className="add-question-button" onClick={addQuestion}>
          <Plus size={16} /> 添加题目
        </button>
      )}
    </div>
  );
}
