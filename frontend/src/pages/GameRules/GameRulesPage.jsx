import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { dataService as gameService } from "../../services/dataService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Banner from "../../components/common/Banner";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  AlertCircle,
  Filter,
} from "lucide-react";

const TYPE_COLORS = {
  general: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  tournament: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  gameplay: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  scoring: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300",
};

const TYPE_LABELS = {
  general: "General",
  tournament: "Tournament",
  gameplay: "Gameplay",
  scoring: "Scoring",
  other: "Other",
};

export default function GameRulesPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [rules, setRules] = useState([]);
  const [gameName, setGameName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  
  // Accordion state
  const [expandedRules, setExpandedRules] = useState(new Set());

  // Fetch game rules
  useEffect(() => {
    const fetchRules = async () => {
      try {
        setLoading(true);
        setError("");
        
        const response = await gameService.getGameRules(gameId, {
          fields: "full",
        });
        
        if (response.success) {
          setRules(response.rules || []);
        }
      } catch (err) {
        console.error("Failed to fetch game rules:", err);
        setError("Failed to load game rules. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [gameId]);

  // Try to get game name from location state (passed from tournament details)
  useEffect(() => {
    if (location.state?.gameName) {
      setGameName(location.state.gameName);
    } else if (location.state?.tournament?.game?.name) {
      setGameName(location.state.tournament.game.name);
    }
  }, [location.state]);

  // Filter rules based on search and type
  const filteredRules = useMemo(() => {
    let filtered = rules;

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter((rule) => rule.type === selectedType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (rule) =>
          rule.title.toLowerCase().includes(query) ||
          rule.content.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [rules, selectedType, searchQuery]);

  // Toggle rule expansion
  const toggleRule = (ruleId) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  // Expand all / Collapse all
  const expandAll = () => {
    setExpandedRules(new Set(filteredRules.map((r) => r.id)));
  };

  const collapseAll = () => {
    setExpandedRules(new Set());
  };

  // Get unique types from rules
  const availableTypes = useMemo(() => {
    const types = new Set(rules.map((r) => r.type));
    return Array.from(types).sort();
  }, [rules]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading game rules..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Game Rules
            </h1>
          </div>
          
          {gameName && (
            <p className="text-gray-600 dark:text-gray-400">
              {gameName}
            </p>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6">
            <Banner
              type="error"
              message={error}
              onClose={() => setError("")}
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                <option value="all">All Types</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expand/Collapse Controls */}
          {filteredRules.length > 0 && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={expandAll}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                Expand All
              </button>
              <span className="text-gray-400">•</span>
              <button
                onClick={collapseAll}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        {/* Rules List */}
        {filteredRules.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Rules Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || selectedType !== "all"
                ? "Try adjusting your filters"
                : "No rules have been added for this game yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRules.map((rule) => {
              const isExpanded = expandedRules.has(rule.id);

              return (
                <div
                  key={rule.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Rule Header (Clickable) */}
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className="w-full px-4 py-4 flex items-start gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {rule.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            TYPE_COLORS[rule.type] || TYPE_COLORS.other
                          }`}
                        >
                          {TYPE_LABELS[rule.type] || rule.type}
                        </span>
                        {rule.version && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            v{rule.version}
                          </span>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {rule.content}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Rule Content (Expandable) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {rule.content}
                        </p>
                      </div>
                      
                      {/* Metadata */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {rule.effective_from && (
                          <span>
                            Effective from:{" "}
                            {new Date(rule.effective_from).toLocaleDateString()}
                          </span>
                        )}
                        {rule.effective_to && (
                          <span>
                            Effective until:{" "}
                            {new Date(rule.effective_to).toLocaleDateString()}
                          </span>
                        )}
                        <span>Priority: {rule.priority}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Results count */}
        {filteredRules.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredRules.length} of {rules.length} rule
            {rules.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
