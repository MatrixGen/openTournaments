import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminService } from '../../services/adminService';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const emptyMode = () => ({ name: '', status: 'active', how_to_play: '' });
const emptyRule = () => ({ title: '', content: '', is_active: true });

const statusOptions = ['active', 'inactive', 'maintenance'];
const modeStatusOptions = ['active', 'inactive'];

export default function AdminGames() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [modes, setModes] = useState([]);
  const [rules, setRules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [banner, setBanner] = useState(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    game_intent: '',
    logo_url: '',
    status: 'inactive',
    description: '',
    banner_url: '',
    cover_url: '',
    promo_video_url: '',
    android_store_url: '',
    ios_store_url: '',
    slug: '',
    theme_color: '',
    is_featured: false,
    sort_order: 0,
    supports_android: true,
    supports_ios: false,
    modes: [emptyMode()],
    rules: [emptyRule()],
  });
  const [creatingGame, setCreatingGame] = useState(false);

  const [newModes, setNewModes] = useState([emptyMode()]);
  const [addingModes, setAddingModes] = useState(false);
  const [newRules, setNewRules] = useState([emptyRule()]);
  const [addingRules, setAddingRules] = useState(false);
  const [savingModes, setSavingModes] = useState({});
  const [savingRules, setSavingRules] = useState({});
  const hasLoadedGames = useRef(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) || null,
    [games, selectedGameId]
  );

  const filteredGames = useMemo(() => {
    if (!searchTerm.trim()) return games;
    const query = searchTerm.trim().toLowerCase();
    return games.filter((game) => game.name?.toLowerCase().includes(query));
  }, [games, searchTerm]);

  useEffect(() => {
    if (!isAdmin || hasLoadedGames.current) return;
    hasLoadedGames.current = true;
    const loadGames = async () => {
      setIsLoadingGames(true);
      try {
        const data = await adminService.getGames();
        setGames(data);
        if (!selectedGameId && data.length > 0) {
          setSelectedGameId(data[0].id);
        }
      } catch (error) {
        setBanner({ type: 'error', title: 'Failed to load games', message: error.message });
      } finally {
        setIsLoadingGames(false);
      }
    };

    loadGames();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedGameId) {
      setModes([]);
      setRules([]);
      return;
    }

    const loadDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const [modesData, rulesData] = await Promise.all([
          adminService.getGameModes(selectedGameId),
          adminService.getGameRules(selectedGameId),
        ]);
        setModes(modesData);
        setRules(rulesData);
      } catch (error) {
        setBanner({ type: 'error', title: 'Failed to load game details', message: error.message });
      } finally {
        setIsLoadingDetails(false);
      }
    };

    setNewModes([emptyMode()]);
    setNewRules([emptyRule()]);
    loadDetails();
  }, [selectedGameId]);

  if (!isLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <LoadingSpinner fullPage text="Loading admin tools" />;
  }

  const handleBannerClose = () => setBanner(null);

  const handleSelectGame = (gameId) => {
    setSelectedGameId(gameId);
    setBanner(null);
  };

  const updateCreateField = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateCreateMode = (index, field, value) => {
    setCreateForm((prev) => {
      const updated = [...prev.modes];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, modes: updated };
    });
  };

  const updateCreateRule = (index, field, value) => {
    setCreateForm((prev) => {
      const updated = [...prev.rules];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, rules: updated };
    });
  };

  const addCreateModeRow = () => {
    setCreateForm((prev) => ({ ...prev, modes: [...prev.modes, emptyMode()] }));
  };

  const removeCreateModeRow = (index) => {
    setCreateForm((prev) => ({
      ...prev,
      modes: prev.modes.filter((_, idx) => idx !== index),
    }));
  };

  const addCreateRuleRow = () => {
    setCreateForm((prev) => ({ ...prev, rules: [...prev.rules, emptyRule()] }));
  };

  const removeCreateRuleRow = (index) => {
    setCreateForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, idx) => idx !== index),
    }));
  };

  const handleCreateGame = async (event) => {
    event.preventDefault();
    setBanner(null);

    const name = createForm.name.trim();
    const game_intent = createForm.game_intent.trim();
    const logo_url = createForm.logo_url.trim();
    const modesPayload = createForm.modes
      .map((mode) => ({
        name: mode.name.trim(),
        status: mode.status || 'active',
        how_to_play: mode.how_to_play?.trim() || undefined,
      }))
      .filter((mode) => mode.name);
    const rulesPayload = createForm.rules
      .map((rule) => ({
        title: rule.title.trim(),
        content: rule.content.trim(),
        is_active: rule.is_active,
      }))
      .filter((rule) => rule.title && rule.content);

    if (!name || !game_intent || !logo_url || modesPayload.length === 0 || rulesPayload.length === 0) {
      setBanner({
        type: 'error',
        title: 'Missing required fields',
        message: 'Name, game intent, logo URL, at least one mode, and one rule are required.',
      });
      return;
    }

    setCreatingGame(true);
    try {
      const response = await adminService.createGame({
        name,
        game_intent,
        logo_url,
        status: createForm.status,
        description: createForm.description.trim() || undefined,
        banner_url: createForm.banner_url.trim() || undefined,
        cover_url: createForm.cover_url.trim() || undefined,
        promo_video_url: createForm.promo_video_url.trim() || undefined,
        android_store_url: createForm.android_store_url.trim() || undefined,
        ios_store_url: createForm.ios_store_url.trim() || undefined,
        slug: createForm.slug.trim() || undefined,
        theme_color: createForm.theme_color.trim() || undefined,
        is_featured: createForm.is_featured,
        sort_order: Number.isFinite(Number(createForm.sort_order))
          ? Number(createForm.sort_order)
          : 0,
        supports_android: createForm.supports_android,
        supports_ios: createForm.supports_ios,
        modes: modesPayload,
        rules: rulesPayload,
      });

      setBanner({
        type: 'success',
        title: 'Game created',
        message: response.message || 'Game created successfully.',
      });

      setGames((prev) => [response.game, ...prev]);
      setSelectedGameId(response.game.id);
      setModes(response.modes || []);
      setRules(response.rules || []);
      setCreateForm({
        name: '',
        game_intent: '',
        logo_url: '',
        status: 'inactive',
        description: '',
        banner_url: '',
        cover_url: '',
        promo_video_url: '',
        android_store_url: '',
        ios_store_url: '',
        slug: '',
        theme_color: '',
        is_featured: false,
        sort_order: 0,
        supports_android: true,
        supports_ios: false,
        modes: [emptyMode()],
        rules: [emptyRule()],
      });
    } catch (error) {
      const message = error.code ? `${error.message} (${error.code})` : error.message;
      setBanner({ type: 'error', title: 'Failed to create game', message });
    } finally {
      setCreatingGame(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedGame) return;
    const previousStatus = selectedGame.status;
    setStatusUpdating(true);
    setGames((prev) =>
      prev.map((game) => (game.id === selectedGame.id ? { ...game, status } : game))
    );

    try {
      const response = await adminService.updateGameStatus(selectedGame.id, { status });
      if (response?.game) {
        setGames((prev) =>
          prev.map((game) => (game.id === response.game.id ? response.game : game))
        );
      }
      setBanner({ type: 'success', title: 'Status updated', message: response.message });
    } catch (error) {
      setGames((prev) =>
        prev.map((game) =>
          game.id === selectedGame.id ? { ...game, status: previousStatus } : game
        )
      );
      const message = error.code ? `${error.message} (${error.code})` : error.message;
      setBanner({ type: 'error', title: 'Status update failed', message });
    } finally {
      setStatusUpdating(false);
    }
  };

  const updateModeField = (index, field, value) => {
    setModes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateRuleField = (index, field, value) => {
    setRules((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveMode = async (mode) => {
    if (!mode?.id) return;
    const name = mode.name?.trim();
    if (!name) {
      setBanner({ type: 'error', title: 'Mode name required', message: 'Mode name cannot be empty.' });
      return;
    }
    setSavingModes((prev) => ({ ...prev, [mode.id]: true }));
    try {
      const response = await adminService.updateGameMode(mode.id, {
        name,
        status: mode.status,
      });
      setModes((prev) =>
        prev.map((item) => (item.id === mode.id ? response.game_mode : item))
      );
      setBanner({ type: 'success', title: 'Mode updated', message: response.message });
    } catch (error) {
      setBanner({ type: 'error', title: 'Mode update failed', message: error.message });
    } finally {
      setSavingModes((prev) => ({ ...prev, [mode.id]: false }));
    }
  };

  const handleSaveRule = async (rule) => {
    if (!rule?.id) return;
    const title = rule.title?.trim();
    const content = rule.content?.trim();
    if (!title || !content) {
      setBanner({
        type: 'error',
        title: 'Rule fields required',
        message: 'Rule title and content cannot be empty.',
      });
      return;
    }
    setSavingRules((prev) => ({ ...prev, [rule.id]: true }));
    try {
      const response = await adminService.updateGameRule(rule.id, {
        title,
        content,
        is_active: rule.is_active,
      });
      setRules((prev) =>
        prev.map((item) => (item.id === rule.id ? response.game_rule : item))
      );
      setBanner({ type: 'success', title: 'Rule updated', message: response.message });
    } catch (error) {
      setBanner({ type: 'error', title: 'Rule update failed', message: error.message });
    } finally {
      setSavingRules((prev) => ({ ...prev, [rule.id]: false }));
    }
  };

  const updateNewMode = (index, field, value) => {
    setNewModes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateNewRule = (index, field, value) => {
    setNewRules((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addNewModeRow = () => setNewModes((prev) => [...prev, emptyMode()]);
  const removeNewModeRow = (index) => {
    setNewModes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addNewRuleRow = () => setNewRules((prev) => [...prev, emptyRule()]);
  const removeNewRuleRow = (index) => {
    setNewRules((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddModes = async () => {
    if (!selectedGame) return;
    const payload = newModes
      .map((mode) => ({
        name: mode.name.trim(),
        status: mode.status || 'active',
        how_to_play: mode.how_to_play?.trim() || undefined,
      }))
      .filter((mode) => mode.name);

    if (!payload.length) {
      setBanner({ type: 'error', title: 'Mode name required', message: 'Add at least one mode.' });
      return;
    }

    setAddingModes(true);
    try {
      const response = await adminService.addGameModes(selectedGame.id, { modes: payload });
      const updatedModes = await adminService.getGameModes(selectedGame.id);
      setModes(updatedModes);
      setNewModes([emptyMode()]);
      setBanner({ type: 'success', title: 'Modes added', message: response.message });
    } catch (error) {
      setBanner({ type: 'error', title: 'Failed to add modes', message: error.message });
    } finally {
      setAddingModes(false);
    }
  };

  const handleAddRules = async () => {
    if (!selectedGame) return;
    const payload = newRules
      .map((rule) => ({
        title: rule.title.trim(),
        content: rule.content.trim(),
        is_active: rule.is_active,
      }))
      .filter((rule) => rule.title && rule.content);

    if (!payload.length) {
      setBanner({ type: 'error', title: 'Rule fields required', message: 'Add at least one rule.' });
      return;
    }

    setAddingRules(true);
    try {
      const response = await adminService.addGameRules(selectedGame.id, { rules: payload });
      const updatedRules = await adminService.getGameRules(selectedGame.id);
      setRules(updatedRules);
      setNewRules([emptyRule()]);
      setBanner({ type: 'success', title: 'Rules added', message: response.message });
    } catch (error) {
      setBanner({ type: 'error', title: 'Failed to add rules', message: error.message });
    } finally {
      setAddingRules(false);
    }
  };

  const refreshGames = async () => {
    setIsLoadingGames(true);
    try {
      const data = await adminService.getGames();
      setGames(data);
    } catch (error) {
      setBanner({ type: 'error', title: 'Failed to refresh', message: error.message });
    } finally {
      setIsLoadingGames(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Games</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage games, required modes, and rule sets.
          </p>
        </div>

        {banner && (
          <div className="mb-6">
            <Banner
              type={banner.type}
              title={banner.title}
              message={banner.message}
              onClose={handleBannerClose}
            />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
          <section className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Games</h2>
              <button
                type="button"
                onClick={refreshGames}
                className="text-xs text-blue-600 hover:text-blue-700"
                disabled={isLoadingGames}
              >
                {isLoadingGames ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search games"
              className="w-full border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
            />
            <div className="mt-4 space-y-2 max-h-[70vh] overflow-y-auto">
              {isLoadingGames && (
                <div className="py-6 flex items-center justify-center">
                  <LoadingSpinner size="sm" text="Loading games" />
                </div>
              )}
              {!isLoadingGames && filteredGames.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">No games found.</p>
              )}
              {!isLoadingGames &&
                filteredGames.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => handleSelectGame(game.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                      selectedGameId === game.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-transparent hover:border-gray-200 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {game.name}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {game.status}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Create Game
              </h2>
              <form onSubmit={handleCreateGame} className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Name
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(event) => updateCreateField('name', event.target.value)}
                      className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Game Intent
                    </label>
                    <input
                      type="text"
                      value={createForm.game_intent}
                      onChange={(event) => updateCreateField('game_intent', event.target.value)}
                      className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={createForm.logo_url}
                      onChange={(event) => updateCreateField('logo_url', event.target.value)}
                      className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(event) => updateCreateField('status', event.target.value)}
                    className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(event) => updateCreateField('description', event.target.value)}
                    className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white min-h-[90px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {showAdvanced ? 'Hide advanced fields' : 'Show advanced fields'}
                </button>

                {showAdvanced && (
                  <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Banner URL
                        </label>
                        <input
                          type="url"
                          value={createForm.banner_url}
                          onChange={(event) => updateCreateField('banner_url', event.target.value)}
                          className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Cover URL
                        </label>
                        <input
                          type="url"
                          value={createForm.cover_url}
                          onChange={(event) => updateCreateField('cover_url', event.target.value)}
                          className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Promo Video URL
                        </label>
                        <input
                          type="url"
                          value={createForm.promo_video_url}
                          onChange={(event) => updateCreateField('promo_video_url', event.target.value)}
                          className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Theme Color
                        </label>
                        <input
                          type="text"
                          value={createForm.theme_color}
                          onChange={(event) => updateCreateField('theme_color', event.target.value)}
                          className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                          placeholder="#0f172a"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Android Store URL
                        </label>
                        <input
                          type="url"
                          value={createForm.android_store_url}
                          onChange={(event) => updateCreateField('android_store_url', event.target.value)}
                          className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          iOS Store URL
                        </label>
                        <input
                          type="url"
                          value={createForm.ios_store_url}
                          onChange={(event) => updateCreateField('ios_store_url', event.target.value)}
                          className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Slug
                        </label>
                        <input
                          type="text"
                          value={createForm.slug}
                          onChange={(event) => updateCreateField('slug', event.target.value)}
                          className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          value={createForm.sort_order}
                          onChange={(event) => updateCreateField('sort_order', event.target.value)}
                          className="w-full mt-1 border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center gap-4 mt-6">
                        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={createForm.is_featured}
                            onChange={(event) => updateCreateField('is_featured', event.target.checked)}
                          />
                          Featured
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={createForm.supports_android}
                          onChange={(event) => updateCreateField('supports_android', event.target.checked)}
                        />
                        Supports Android
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={createForm.supports_ios}
                          onChange={(event) => updateCreateField('supports_ios', event.target.checked)}
                        />
                        Supports iOS
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Modes (required)
                    </h3>
                    <button
                      type="button"
                      onClick={addCreateModeRow}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Add Mode
                    </button>
                  </div>
                  <div className="space-y-3">
                    {createForm.modes.map((mode, index) => (
                      <div key={`create-mode-${index}`} className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3">
                          <input
                            type="text"
                            value={mode.name}
                            onChange={(event) => updateCreateMode(index, 'name', event.target.value)}
                            placeholder="Mode name"
                            className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                          />
                          <select
                            value={mode.status}
                            onChange={(event) => updateCreateMode(index, 'status', event.target.value)}
                            className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                          >
                            {modeStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeCreateModeRow(index)}
                            className="text-xs text-gray-500 hover:text-red-500"
                            disabled={createForm.modes.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                        <textarea
                          value={mode.how_to_play}
                          onChange={(event) => updateCreateMode(index, 'how_to_play', event.target.value)}
                          placeholder="How to play (optional)"
                          className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white min-h-[80px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Rules (required)
                    </h3>
                    <button
                      type="button"
                      onClick={addCreateRuleRow}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Add Rule
                    </button>
                  </div>
                  <div className="space-y-3">
                    {createForm.rules.map((rule, index) => (
                      <div
                        key={`create-rule-${index}`}
                        className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3"
                      >
                        <input
                          type="text"
                          value={rule.title}
                          onChange={(event) => updateCreateRule(index, 'title', event.target.value)}
                          placeholder="Rule title"
                          className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                        <textarea
                          value={rule.content}
                          onChange={(event) => updateCreateRule(index, 'content', event.target.value)}
                          placeholder="Rule content"
                          className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white min-h-[80px]"
                        />
                        <div className="flex flex-col items-start gap-2">
                          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={rule.is_active}
                              onChange={(event) =>
                                updateCreateRule(index, 'is_active', event.target.checked)
                              }
                            />
                            Active
                          </label>
                          <button
                            type="button"
                            onClick={() => removeCreateRuleRow(index)}
                            className="text-xs text-gray-500 hover:text-red-500"
                            disabled={createForm.rules.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md disabled:opacity-60"
                    disabled={creatingGame}
                  >
                    {creatingGame ? 'Creating...' : 'Create Game'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Game Summary
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedGame ? `Game ID: ${selectedGame.id}` : 'Select a game to manage.'}
                  </p>
                </div>
                {selectedGame && (
                  <select
                    value={selectedGame.status}
                    onChange={(event) => handleStatusChange(event.target.value)}
                    disabled={statusUpdating}
                    className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {!selectedGame && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose a game from the left to view and edit details.
                </p>
              )}
              {selectedGame && (
                <div className="flex items-center gap-4">
                  <img
                    src={selectedGame.logo_url}
                    alt={`${selectedGame.name} logo`}
                    className="h-16 w-16 rounded-lg border border-gray-200 dark:border-neutral-700 object-cover"
                    onError={(event) => {
                      event.currentTarget.src = '/ot_arena_logo.svg';
                    }}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedGame.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Status: {selectedGame.status}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-5 ${
                !selectedGame ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Modes Management
                </h2>
                {isLoadingDetails && <span className="text-xs text-gray-500">Loading...</span>}
              </div>
              {selectedGame && (
                <div className="space-y-3">
                  {modes.map((mode, index) => (
                    <div key={mode.id} className="grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3">
                        <input
                          type="text"
                          value={mode.name || ''}
                          onChange={(event) => updateModeField(index, 'name', event.target.value)}
                          className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                        <select
                          value={mode.status}
                          onChange={(event) => updateModeField(index, 'status', event.target.value)}
                          className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        >
                          {modeStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleSaveMode(mode)}
                          className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-60"
                          disabled={savingModes[mode.id]}
                        >
                          {savingModes[mode.id] ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      <textarea
                        value={mode.how_to_play || ''}
                        onChange={(event) => updateModeField(index, 'how_to_play', event.target.value)}
                        className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white min-h-[80px]"
                        placeholder="How to play"
                      />
                    </div>
                  ))}
                  {!modes.length && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No modes yet. Add modes below.
                    </p>
                  )}
                </div>
              )}

              {selectedGame && (
                <div className="mt-4 border-t border-gray-200 dark:border-neutral-700 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Add Modes
                    </h3>
                    <button
                      type="button"
                      onClick={addNewModeRow}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Add Row
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newModes.map((mode, index) => (
                      <div key={`new-mode-${index}`} className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3">
                          <input
                            type="text"
                            value={mode.name}
                            onChange={(event) => updateNewMode(index, 'name', event.target.value)}
                            placeholder="Mode name"
                            className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                          />
                          <select
                            value={mode.status}
                            onChange={(event) => updateNewMode(index, 'status', event.target.value)}
                            className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                          >
                            {modeStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeNewModeRow(index)}
                            className="text-xs text-gray-500 hover:text-red-500"
                            disabled={newModes.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                        <textarea
                          value={mode.how_to_play}
                          onChange={(event) => updateNewMode(index, 'how_to_play', event.target.value)}
                          placeholder="How to play (optional)"
                          className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white min-h-[80px]"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      onClick={handleAddModes}
                      className="bg-blue-600 text-white text-xs px-3 py-2 rounded-md disabled:opacity-60"
                      disabled={addingModes}
                    >
                      {addingModes ? 'Adding...' : 'Add Modes'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-5 ${
                !selectedGame ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Rules Management
                </h2>
                {isLoadingDetails && <span className="text-xs text-gray-500">Loading...</span>}
              </div>
              {selectedGame && (
                <div className="space-y-4">
                  {rules.map((rule, index) => (
                    <div key={rule.id} className="border border-gray-200 dark:border-neutral-700 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
                        <input
                          type="text"
                          value={rule.title || ''}
                          onChange={(event) => updateRuleField(index, 'title', event.target.value)}
                          className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                        <textarea
                          value={rule.content || ''}
                          onChange={(event) => updateRuleField(index, 'content', event.target.value)}
                          className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white min-h-[80px]"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={!!rule.is_active}
                            onChange={(event) =>
                              updateRuleField(index, 'is_active', event.target.checked)
                            }
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSaveRule(rule)}
                          className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-60"
                          disabled={savingRules[rule.id]}
                        >
                          {savingRules[rule.id] ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {!rules.length && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No rules yet. Add rules below.
                    </p>
                  )}
                </div>
              )}

              {selectedGame && (
                <div className="mt-4 border-t border-gray-200 dark:border-neutral-700 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Add Rules
                    </h3>
                    <button
                      type="button"
                      onClick={addNewRuleRow}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Add Row
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newRules.map((rule, index) => (
                      <div
                        key={`new-rule-${index}`}
                        className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3"
                      >
                        <input
                          type="text"
                          value={rule.title}
                          onChange={(event) => updateNewRule(index, 'title', event.target.value)}
                          placeholder="Rule title"
                          className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
                        />
                        <textarea
                          value={rule.content}
                          onChange={(event) => updateNewRule(index, 'content', event.target.value)}
                          placeholder="Rule content"
                          className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white min-h-[80px]"
                        />
                        <div className="flex flex-col items-start gap-2">
                          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={rule.is_active}
                              onChange={(event) =>
                                updateNewRule(index, 'is_active', event.target.checked)
                              }
                            />
                            Active
                          </label>
                          <button
                            type="button"
                            onClick={() => removeNewRuleRow(index)}
                            className="text-xs text-gray-500 hover:text-red-500"
                            disabled={newRules.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      onClick={handleAddRules}
                      className="bg-blue-600 text-white text-xs px-3 py-2 rounded-md disabled:opacity-60"
                      disabled={addingRules}
                    >
                      {addingRules ? 'Adding...' : 'Add Rules'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
