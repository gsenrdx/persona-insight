import React, { useState, useEffect, useMemo, useCallback } from 'react'; // useCallback 추가
import UserDetailComponent from './UserDetailComponent';

interface User {
  id: number;
  name: string;
  isActive: boolean;
  department: string;
}

const fetchUsers = async (): Promise<User[]> => {
  return new Promise(resolve => setTimeout(() => resolve([
    { id: 1, name: 'Alice', isActive: true, department: 'HR' },
    { id: 2, name: 'Bob', isActive: false, department: 'Engineering' },
    { id: 3, name: 'Charlie', isActive: true, department: 'Engineering' },
    { id: 4, name: 'Diana', isActive: true, department: 'HR' },
  ]), 500));
};

const UserListComponent = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [themeColor, setThemeColor] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const displayedUsers = useMemo(() => {
    console.log('Filtering and searching users (memoized)...');
    let filtered = users;
    if (filterDepartment !== 'All') {
      filtered = filtered.filter(user => user.department === filterDepartment);
    }
    if (searchTerm) {
      filtered = filtered.filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered;
  }, [users, filterDepartment, searchTerm]);

  // TO-BE: useCallback을 사용하여 함수가 의존하는 users 상태가 변경될 때만 함수를 재생성
  const handlePromoteUser = useCallback((userId: number) => {
    console.log(`Promoting user with ID: ${userId} by ${UserListComponent.name} (Callback)`);
    setUsers(prevUsers => prevUsers.map(u => u.id === userId ? {...u, department: `${u.department} (Promoted)`} : u));
  }, []); // users 상태에 의존하므로, 의존성 배열에 users를 추가해야 하지만,
            // setUsers의 함수형 업데이트를 사용하면 users 직접 의존성을 제거할 수 있음.
            // 여기서는 setUsers(prevUsers => ...) 형태를 사용했으므로 빈 배열로 두어도 안전.

  // TO-BE: useMemo를 사용하여 테마 색상이 변경될 때만 스타일 객체를 재생성
  const detailStyle = useMemo(() => {
    console.log('Recreating detailStyle (memoized)...');
    return {
      backgroundColor: themeColor === 'light' ? '#f9f9f9' : '#333',
      color: themeColor === 'light' ? '#333' : '#f9f9f9'
    };
  }, [themeColor]);

  console.log('Rendering UserListComponent...');

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => setThemeColor(themeColor === 'light' ? 'dark' : 'light')}>
        Toggle Theme (UserList re-renders, but UserDetail might not if props unchanged)
      </button>
      <div style={{ margin: '10px 0' }}>
        <select onChange={e => setFilterDepartment(e.target.value)} value={filterDepartment}>
          <option value="All">All Departments</option>
          <option value="HR">HR</option>
          <option value="Engineering">Engineering</option>
        </select>
        <input style={{ marginLeft: '10px' }} type="text" placeholder="Search by name" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>
      <p>Showing {displayedUsers.length} users. Current theme: {themeColor}</p>
      <div>
        {displayedUsers.map(user => (
          <UserDetailComponent
            key={user.id}
            user={user} // user 객체 자체가 변경되면 리렌더링됨 (정상)
            onPromote={handlePromoteUser} // 이제 메모아이즈된 함수 전달
            style={detailStyle} // 이제 메모아이즈된 객체 전달
          />
        ))}
      </div>
    </div>
  );
};

export default UserListComponent;
