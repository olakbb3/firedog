import { memo } from 'react';

export interface AthleteAffiliation {
  gym_affiliation?: string | null;
  fd_affiliation?: string | null;
  fd_career_volunteer?: string | null;
}

interface Props {
  profile?: AthleteAffiliation | null;
  compact?: boolean;
}

const AthleteBadges = memo(({ profile, compact = false }: Props) => {
  if (!profile) return null;
  const { gym_affiliation, fd_affiliation, fd_career_volunteer } = profile;
  if (!gym_affiliation && !fd_affiliation) return null;

  const sizeClass = compact
    ? 'text-[9px] px-1.5 py-0.5'
    : 'text-[10px] px-2 py-0.5';

  return (
    <span className="flex flex-wrap gap-1 items-center min-w-0">
      {gym_affiliation && (
        <span
          className={`${sizeClass} rounded-full bg-secondary text-secondary-foreground truncate max-w-[100px]`}
          title={gym_affiliation}
        >
          🏋️ {gym_affiliation}
        </span>
      )}
      {fd_affiliation && (
        <span
          className={`${sizeClass} rounded-full bg-secondary text-secondary-foreground truncate max-w-[120px]`}
          title={`${fd_affiliation}${fd_career_volunteer ? ` · ${fd_career_volunteer}` : ''}`}
        >
          🚒 {fd_affiliation}
          {fd_career_volunteer ? ` · ${fd_career_volunteer.charAt(0)}` : ''}
        </span>
      )}
    </span>
  );
});

AthleteBadges.displayName = 'AthleteBadges';

export default AthleteBadges;
