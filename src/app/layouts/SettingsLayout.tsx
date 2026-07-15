import { Outlet } from 'react-router';

export default function SettingsLayout() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="w-full px-8 py-8">
        <Outlet />
      </div>
    </div>
  );
}
