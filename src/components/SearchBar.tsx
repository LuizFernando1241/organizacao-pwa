import { forwardRef } from 'react'
import { Search } from 'lucide-react'
import './SearchBar.css'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { value, onChange, placeholder = 'Buscar' }: SearchBarProps,
  ref,
) {
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
        ref={ref}
      />
    </label>
  )
})

export default SearchBar
