import React, { useEffect, useState } from "react"
import type { Tag, Project } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"

export const TagsSettings: React.FC = () => {
  const { adapter } = useAdapter()
  const [project, setProject] = useState<Project | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [name, setName] = useState("")
  const [color, setColor] = useState("#0ea5e9")

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject()
      setProject(p)
      const ts = await adapter.listProjectTags(p.id)
      setTags(ts)
    }
    run()
  }, [])

  async function addTag() {
    if (!project || !name.trim()) return
    const tg = await adapter.addProjectTag(project.id, name.trim(), color)
    setTags((prev) => [...prev, tg].sort((a, b) => a.name.localeCompare(b.name)))
    setName("")
  }
  async function removeTag(tagId: string) {
    await adapter.removeProjectTag(tagId)
    setTags((prev) => prev.filter((t) => t.id !== tagId))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <input className="w-48 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" placeholder="タグ名" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="h-8 w-16 cursor-pointer" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <button type="button" className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white" onClick={addTag}>追加</button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {tags.map((tg) => (
          <li key={tg.id} className="inline-flex items-center gap-2 rounded px-2 py-1 text-sm" style={{ backgroundColor: `${tg.color}22`, color: tg.color }}>
            <span>{tg.name}</span>
            <button type="button" className="text-zinc-500" onClick={() => removeTag(tg.id)}>削除</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

