import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactElement } from 'react';
import ParticipantFilter, { type ParticipantFilterHandle } from '../ParticipantFilter';
import SidebarCount, { type SidebarCountHandle } from '@/components/event-page/SidebarCount';
import type { AvailabilityLevel, EventMode } from '@/lib/types';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useRef: (current: unknown) => ({ current }),
    useMemo: (factory: () => unknown) => factory(),
    useEffect: () => undefined,
    useImperativeHandle: (ref: { current: unknown }, factory: () => unknown) => { ref.current = factory(); },
  };
});

class RowClasses {
  readonly values: Set<string>;
  writes = 0;
  constructor(value: string) { this.values = new Set(value.split(/\s+/).filter(Boolean)); }
  contains(value: string) { return this.values.has(value); }
  [Symbol.iterator]() { return this.values.values(); }
  get value() { return [...this.values].join(' '); }
  set value(value: string) {
    this.writes++;
    this.values.clear();
    value.split(/\s+/).filter(Boolean).forEach(token => this.values.add(token));
  }
  add(...values: string[]) { this.writes++; values.forEach(value => this.values.add(value)); }
  remove(...values: string[]) { this.writes++; values.forEach(value => this.values.delete(value)); }
  toggle(value: string, force: boolean) {
    if (this.contains(value) === force) return force;
    if (force) this.add(value);
    else this.remove(value);
    return force;
  }
}

function mountFilter(eventMode: EventMode = 'available') {
  const participants = ['a', 'b', 'c', 'd'].map(id => ({ id, name: id }));
  const ref = { current: null as ParticipantFilterHandle | null };
  type Row = ReactElement<{ className: string; ref: (element: HTMLDivElement | null) => void }>;
  const component = ParticipantFilter as unknown as {
    render: (props: ComponentProps<typeof ParticipantFilter>, handle: typeof ref) => ReactElement<{ children: ReactElement<{ children: Row[] }> }>;
  };
  const tree = component.render({ participants, selectedIds: new Set(participants.map(p => p.id)), onSelectedChange: vi.fn(), eventMode }, ref);
  const rows = tree.props.children.props.children.map(element => {
    const classList = new RowClasses(element.props.className);
    element.props.ref({ classList } as unknown as HTMLDivElement);
    return classList;
  });
  const preview = (values: (AvailabilityLevel | undefined)[] | null) => ref.current!.previewSlot(
    values ? new Map(participants.map((p, index) => [p.id, values[index]])) : null,
  );
  return { rows, preview, writes: () => rows.reduce((sum, row) => sum + row.writes, 0) };
}

describe('연속 셀 호버의 응답자 표시', () => {
  it('같은 응답 상태를 다시 표시할 때 DOM 클래스를 다시 쓰지 않는다', () => {
    const filter = mountFilter();
    filter.preview([2, 1, 0, undefined]);
    expect(filter.rows[0].contains('bg-[#FFE8B8]')).toBe(false);
    expect(filter.rows[1].contains('bg-[#FFE8B8]')).toBe(true);
    expect(filter.rows[2].contains('[&_.p-name]:line-through')).toBe(true);
    expect(filter.rows[3].contains('[&_.p-name]:line-through')).toBe(true);
    const writes = filter.writes();
    filter.preview([2, 1, 0, undefined]);
    expect(filter.writes()).toBe(writes);
  });

  it('상태가 다른 셀로 이동하거나 호버가 끝나면 색과 취소선을 정확히 복원한다', () => {
    const filter = mountFilter();
    filter.preview([1, 0, 2, undefined]);
    filter.preview([0, 2, 1, 2]);
    expect(filter.rows[0].contains('bg-[#FFE8B8]')).toBe(false);
    expect(filter.rows[0].contains('[&_.p-name]:line-through')).toBe(true);
    expect(filter.rows[1].contains('[&_.p-name]:line-through')).toBe(false);
    expect(filter.rows[2].contains('bg-[#FFE8B8]')).toBe(true);
    filter.preview(null);
    expect(filter.rows.every(row => !row.contains('bg-[#FFE8B8]') && !row.contains('[&_.p-name]:line-through'))).toBe(true);
    const writes = filter.writes();
    filter.preview(null);
    expect(filter.writes()).toBe(writes);
  });

  it('불가능 모드에서 무응답은 가능으로 표시하고 명시적 불가능만 취소선을 표시한다', () => {
    const filter = mountFilter('unavailable');
    filter.preview([undefined, 0, 1, 2]);
    expect(filter.rows.map(row => row.contains('[&_.p-name]:line-through'))).toEqual([false, true, false, false]);
    expect(filter.rows.every(row => !row.contains('bg-[#FFE8B8]'))).toBe(true);
  });
});

describe('연속 셀 호버의 응답자 수', () => {
  it('같은 숫자는 다시 쓰지 않고 0명과 호버 종료를 구분한다', () => {
    const ref = { current: null as SidebarCountHandle | null };
    const component = SidebarCount as unknown as {
      render: (props: ComponentProps<typeof SidebarCount>, handle: typeof ref) => ReactElement<{ children: unknown[] }>;
    };
    const tree = component.render({ selectedCount: 20, totalCount: 20 }, ref);
    const span = tree.props.children[2] as ReactElement<{ ref: { current: unknown } }>;
    let text = '(20/20)';
    let writes = 0;
    span.props.ref.current = {
      get textContent() { return text; },
      set textContent(value: string) { text = value; writes++; },
    };
    ref.current!.updateForSlot(20);
    expect(writes).toBe(0);
    ref.current!.updateForSlot(0);
    ref.current!.updateForSlot(0);
    expect(text).toBe('(0/20)');
    expect(writes).toBe(1);
    ref.current!.updateForSlot(null);
    ref.current!.updateForSlot(null);
    expect(text).toBe('(20/20)');
    expect(writes).toBe(2);
  });
});
