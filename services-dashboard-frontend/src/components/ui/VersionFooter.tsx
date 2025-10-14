import { useQuery } from '@tanstack/react-query';
import { updateApi } from '../../services/updateApi';

interface VersionFooterProps {
  darkMode?: boolean;
}

export const VersionFooter: React.FC<VersionFooterProps> = ({ darkMode = true }) => {
  const { data: versionInfo } = useQuery({
    queryKey: ['current-version'],
    queryFn: updateApi.getCurrentVersion,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  if (!versionInfo?.version) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-sm border ${
      darkMode
        ? 'bg-gray-800/80 border-gray-700 text-gray-400'
        : 'bg-white/80 border-gray-200 text-gray-600'
    }`}>
      <span className="opacity-75">v</span>{versionInfo.version}
    </div>
  );
};
