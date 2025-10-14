import { describe, it, expect } from 'vitest'
import type { Task } from '@/types/domain'
import { buildTree, wbsNumber, rollupEstimatedHours, rollupDates, rollupProgressWeighted } from '@/lib/wbs-utils'

function t(id: string, parentId?: string, sortIndex?: number, props: Partial<Task> = {}): Task {
  return {
    id,
    projectId: 'p1',
    columnId: 'c1',
    title: id,
    progress: 0,
    sortIndex: sortIndex ?? 1000,
    createdAt: '2025-01-01',
    createdBy: 'u1',
    parentId,
    ...props,
  }
}

describe('wbs-utils', () => {
  it('builds tree and numbers correctly', () => {
    const tasks: Task[] = [
      t('A', undefined, 1000),
      t('B', undefined, 2000),
      t('A1', 'A', 1000),
      t('A2', 'A', 2000),
      t('A2-1', 'A2', 1000),
    ]
    const tree = buildTree(tasks)
    expect(tree.length).toBe(2)
    const a = tree[0]
    const b = tree[1]
    expect(wbsNumber(a)).toBe('1')
    expect(wbsNumber(b)).toBe('2')
    expect(a.children.length).toBe(2)
    expect(wbsNumber(a.children[0], '1')).toBe('1.1')
    expect(wbsNumber(a.children[1], '1')).toBe('1.2')
    expect(a.children[1].children.length).toBe(1)
    expect(wbsNumber(a.children[1].children[0], '1.2')).toBe('1.2.1')
  })

  it('rolls up hours, dates and progress', () => {
    const tasks: Task[] = [
      t('A', undefined, 1000, { estimatedHours: 2, progress: 50, startDate: '2025-01-02', dueDate: '2025-01-05' }),
      t('A1', 'A', 1000, { estimatedHours: 3, progress: 0, startDate: '2025-01-01', dueDate: '2025-01-03' }),
      t('A2', 'A', 2000, { estimatedHours: 5, progress: 100, startDate: '2025-01-04', dueDate: '2025-01-10' }),
    ]
    const a = buildTree(tasks)[0]
    expect(rollupEstimatedHours(a)).toBe(10)
    const d = rollupDates(a)
    expect(d.start).toBe('2025-01-01')
    expect(d.due).toBe('2025-01-10')
    const p = rollupProgressWeighted(a)
    // weighted avg: (50*2 + 0*3 + 100*5) / (2+3+5) = 650/10 = 65
    expect(Math.round(p)).toBe(65)
  })
})

