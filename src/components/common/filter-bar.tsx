import React from "react"

export type FilterBarProps = {
  q?: string
  tagId?: string
  tags?: { id: string; name: string }[]
  onChange: (patch: { q?: string; tagId?: string }) => void
}

export const FilterBar: React.FC<FilterBarProps> = ({ q = "", tagId = "", tags = [], onChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        className="min-w-[200px] flex-1 rounded border border-zinc-300 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800"
        placeholder="検索..."
        value={q}
        onChange={(e) => onChange({ q: e.target.value })}
      />
      <select
        className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        value={tagId}
        onChange={(e) => onChange({ tagId: e.target.value })}
      >
        <option value="">タグ（すべて）</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  )
}

