import './SearchBar.css'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function SearchBar({ value, onChange, placeholder = 'Buscar' }: SearchBarProps) {
  return (
    <input
      type="search"
      className="search-bar"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  )
}

export default SearchBar
