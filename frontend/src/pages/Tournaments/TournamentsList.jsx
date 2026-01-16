import Tournaments from './Tournaments';

const makeListVariant = (config) => (props) => <Tournaments {...config} {...props} />;

const TournamentsList = {
  All: makeListVariant({}),
  My: makeListVariant({
    tournamentType: 'my',
    title: 'My Tournaments',
    subtitle: "Tournaments you've joined or created",
    showCreateButton: false,
  }),
  Joined: makeListVariant({
    tournamentType: 'joined',
    title: 'Joined Tournaments',
    subtitle: "Tournaments you're participating in",
    showCreateButton: false,
  }),
  Created: makeListVariant({
    tournamentType: 'created',
    title: "Created Tournaments",
    subtitle: "Tournaments you've organized",
    showCreateButton: false,
  }),
  Upcoming: makeListVariant({
    tournamentType: 'upcoming',
    title: 'Upcoming Tournaments',
    subtitle: 'Tournaments starting soon',
    customFilters: { status: 'upcoming' },
  }),
  Live: makeListVariant({
    tournamentType: 'live',
    title: 'Live Tournaments',
    subtitle: 'Tournaments currently in progress',
    customFilters: { status: 'ongoing' },
  }),
  Completed: makeListVariant({
    tournamentType: 'completed',
    title: 'Completed Tournaments',
    subtitle: 'Tournaments that have ended',
    customFilters: { status: 'completed' },
    showCreateButton: false,
  }),
  UserTournaments: ({ userId: listUserId, ...props }) => (
    <Tournaments
      tournamentType="user"
      userId={listUserId}
      title="User Tournaments"
      subtitle="Tournaments by user"
      showCreateButton={false}
      {...props}
    />
  ),
  Compact: makeListVariant({
    compact: true,
    hideHeader: true,
    hideTips: true,
    showFilters: false,
    showStats: false,
    maxTournaments: 4,
    layout: 'grid',
  }),
  SidebarList: makeListVariant({
    compact: true,
    hideHeader: true,
    hideTips: true,
    showFilters: false,
    showSearch: false,
    showStats: false,
    maxTournaments: 6,
    layout: 'list',
  }),
};

export default TournamentsList;
