import React from 'react';

interface User {
  id: number;
  name: string;
  department: string;
  // ... other user details
}

interface UserDetailProps {
  user: User;
  onPromote?: (userId: number) => void; // 사용자를 승진시키는 가상의 함수
  style?: React.CSSProperties;
}

// React.memo를 사용하여 props가 변경되지 않으면 리렌더링 방지
const UserDetailComponent: React.FC<UserDetailProps> = React.memo(({ user, onPromote, style }) => {
  console.log(`Rendering UserDetailComponent for ${user.name} (Memoized)`);
  return (
    <div style={{ border: '1px solid lightgray', padding: '10px', margin: '5px', borderRadius: '4px', ...style }}>
      <h4>{user.name}</h4>
      <p>Department: {user.department}</p>
      {onPromote && (
        <button onClick={() => onPromote(user.id)}>Promote {user.name}</button>
      )}
    </div>
  );
});

export default UserDetailComponent;
