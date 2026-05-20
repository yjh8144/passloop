export function Segmented(props: {
  value: string
  options: Array<[string, string]>
  onChange: (value: string) => void
}) {
  return (
    <div className="segmented">
      {props.options.map(([value, label]) => (
        <button
          key={value}
          className={props.value === value ? "active" : ""}
          onClick={() => props.onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
