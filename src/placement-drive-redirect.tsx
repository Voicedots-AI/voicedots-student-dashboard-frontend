import { Navigate, useLocation } from 'react-router-dom';

/** Old discussion/setup URLs now return students to the real drive entry point. */
export function PlacementDriveRedirect() {
  const location = useLocation();
  const drive = new URLSearchParams(location.search).get('drive');
  const query = drive ? `?${new URLSearchParams({ drive })}` : '';
  return <Navigate to={`/placements${query}`} replace />;
}
