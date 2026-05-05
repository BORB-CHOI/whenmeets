/**
 * 응답자 단독↔수합 토글 룰
 *
 * - 전체 선택 상태에서 한 명 클릭 → 그 사람 단독 (나머지 자동 해제)
 * - 부분 선택 상태에서 클릭 → 추가/해제 토글
 * - 모두 해제 → 자동 전체 선택 복귀
 *
 * `selectedIds.size === 1` 일 때 호출하는 쪽에서 includeIfNeeded 자동 ON 처리.
 */
export function toggleParticipant(
  current: Set<string>,
  clickedId: string,
  allIds: string[],
): Set<string> {
  const allSelected = current.size === allIds.length;

  // 전체 선택 상태 → 클릭한 사람 단독
  if (allSelected) return new Set([clickedId]);

  const next = new Set(current);
  if (next.has(clickedId)) {
    next.delete(clickedId);
  } else {
    next.add(clickedId);
  }

  // 모두 해제 → 자동 전체 선택 복귀
  if (next.size === 0) return new Set(allIds);

  return next;
}
