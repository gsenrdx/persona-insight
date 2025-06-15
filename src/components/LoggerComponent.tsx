import React, { useState, useEffect, useCallback } from 'react'; // useCallback 추가

interface Data {
  id: number;
  value: string;
  // timestamp?: number;
}

const LoggerComponent = ({ data }: { data: Data }) => {
  const [internalCount, setInternalCount] = useState(0);

  // 해결 1: 의존성 배열 누락 문제 해결
  // 만약 모든 렌더링 시 실행되어야 한다면 그대로 두지만 (드묾),
  // 보통은 특정 조건에서만 실행되길 원함. 여기서는 internalCount 변경 시로 가정.
  useEffect(() => {
    console.log('LoggerComponent internalCount changed:', internalCount);
  }, [internalCount]); // internalCount가 변경될 때만 실행

  // 해결 2 & 3: data 객체 대신 실제 사용하는 data.id를 의존성으로 사용
  // 또는 data 객체 자체가 변경되지 않도록 부모에서 useMemo 등을 사용해야 함.
  // 여기서는 data.id만 사용한다고 가정.
  const dataId = data.id; // data.id를 변수로 추출
  useEffect(() => {
    console.log('Data ID changed (Optimized):', dataId);
    // fetchDataBasedOnData(dataId);
  }, [dataId]); // data.id가 변경될 때만 실행. data 객체 전체가 아닌 ID만 의존.

  // 해결 4: 함수를 의존성 배열에 넣는 경우 useCallback으로 메모아이제이션
  // 또는 함수를 useEffect 내부로 옮기거나, 의존하지 않도록 수정.
  const logCurrentCount = useCallback(() => {
    console.log(`Internal count is: ${internalCount} (Optimized useEffect with useCallback)`);
  }, [internalCount]); // internalCount에 의존하므로 의존성 배열에 추가

  useEffect(() => {
    logCurrentCount();
  }, [logCurrentCount]); // 이제 logCurrentCount는 internalCount가 변경될 때만 재생성됨

  // useEffect 내부로 함수를 옮기는 대안 (더 선호될 수 있음)
  useEffect(() => {
    const logCurrentCountInternal = () => {
      console.log(`Internal count is: ${internalCount} (Function inside useEffect)`);
    };
    logCurrentCountInternal();
  }, [internalCount]);


  console.log(`Rendering LoggerComponent. Data ID: ${data.id}`);
  return (
    <div style={{ border: '1px dashed green', padding: '10px', marginTop: '10px' }}>
      <p>Logger Component. Data ID: {data.id}, Value: {data.value}</p>
      <p>Internal Count: {internalCount}</p>
      <button onClick={() => setInternalCount(c => c + 1)}>Increment Internal (Logger)</button>
    </div>
  );
};

// 외부에서 LoggerComponent를 사용하는 예시를 위해 부모 컴포넌트도 간단히 만듦
// 부모 컴포넌트는 변경 없음 (자식 컴포넌트의 useEffect 최적화에 집중)
const LoggerParentComponent = () => {
  const [mainData, setMainData] = useState({ id: 1, value: 'Initial Data', timestamp: Date.now() });
  const [unrelatedState, setUnrelatedState] = useState(0);

  const handleUpdateDataSameId = () => {
    // ID는 그대로 두고 value와 timestamp만 변경 -> LoggerComponent의 data prop은 새 객체
    setMainData(prev => ({ ...prev, value: `Updated Value ${Date.now()}`, timestamp: Date.now() }));
  };

  const handleUpdateDataNewId = () => {
    setMainData(prev => ({ id: prev.id + 1, value: `New ID Value ${Date.now()}`, timestamp: Date.now() }));
  };


  return (
    <div>
      <h3>Logger Parent</h3>
      <button onClick={handleUpdateDataSameId}>Update Logger Data (ID same, new object)</button>
      <button onClick={handleUpdateDataNewId}>Update Logger Data (New ID, new object)</button>
      <button onClick={() => setUnrelatedState(c => c + 1)}>Update Parent's Unrelated State</button>
      <p>Parent unrelated state: {unrelatedState}</p>
      <LoggerComponent data={mainData} />
    </div>
  );
}

export default LoggerParentComponent;
