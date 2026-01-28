import { Search } from 'lucide-react'
import './SearchBar.css'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function SearchBar({ value, onChange, placeholder = 'Buscar' }: SearchBarProps) {
  return (
    <label className="search-bar" aria-label={placeholder}>
      <span className="search-bar__icon" aria-hidden="true">
        <Search size={16} />
      </span>
      <input
        type="search"
        className="search-bar__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

export default SearchBar
