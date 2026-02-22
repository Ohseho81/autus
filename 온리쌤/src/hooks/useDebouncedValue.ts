import { useEffect, useState } from 'react';

/**
 * 디바운스된 값을 반환하는 Hook
 * 검색 입력 최적화에 사용
 *
 * @param value - 디바운스할 값
 * @param delay - 지연 시간 (밀리초)
 * @returns 디바운스된 값
 *
 * @example
 * const [searchText, setSearchText] = useState('');
 * const debouncedSearch = useDebouncedValue(searchText, 300);
 *
 * useEffect(() => {
 *   // debouncedSearch가 변경될 때만 API 호출
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // delay 후에 값 업데이트
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // cleanup: 다음 effect 실행 전에 이전 timeout 취소
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
