const { Game, GameMode, GameRule, sequelize } = require('../models');
const { normalizeName, isNonEmptyString, isValidUrl } = require('../utils/gameValidation');
const { mapGameControllerError } = require('../utils/gameErrorResponse');

const GAME_STATUSES = new Set(['active', 'inactive', 'maintenance']);
const MODE_STATUSES = new Set(['active', 'inactive']);
const GAME_INTENT_REGEX = /^[a-zA-Z0-9._:-]+$/;

const buildModePayloads = (modes) => {
  if (!Array.isArray(modes) || modes.length < 1) {
    return { error: { message: 'At least one game mode is required.' } };
  }

  const payloads = [];
  let activeCount = 0;

  for (const mode of modes) {
    const name = normalizeName(mode?.name);
    if (!isNonEmptyString(name)) {
      return { error: { message: 'Each game mode must include a name.' } };
    }

    const status = typeof mode?.status === 'string' ? mode.status.trim().toLowerCase() : 'active';
    if (!MODE_STATUSES.has(status)) {
      return { error: { message: 'Invalid game mode status.' } };
    }

    if (status === 'active') activeCount += 1;
    const howToPlay =
      typeof mode?.how_to_play === 'string' ? mode.how_to_play.trim() : null;
    payloads.push({ name, status, how_to_play: howToPlay || null });
  }

  return { payloads, activeCount };
};

const buildRulePayloads = (rules) => {
  if (!Array.isArray(rules) || rules.length < 1) {
    return { error: { message: 'At least one game rule is required.' } };
  }

  const payloads = [];
  let activeCount = 0;

  for (const rule of rules) {
    const title = normalizeName(rule?.title);
    const content = typeof rule?.content === 'string' ? rule.content.trim() : '';

    if (!isNonEmptyString(title) || !isNonEmptyString(content)) {
      return { error: { message: 'Each game rule must include a title and content.' } };
    }

    const isActive = typeof rule?.is_active === 'boolean' ? rule.is_active : true;
    if (isActive) activeCount += 1;

    payloads.push({ title, content, is_active: isActive });
  }

  return { payloads, activeCount };
};

const buildErrorResponse = (res, error) => {
  const { status, body } = mapGameControllerError(error);
  return res.status(status).json(body);
};

const getGames = async (req, res) => {
  
  try {
    const games = await Game.findAll({
      order: [['created_at', 'DESC']],
    });
    return res.json(games);
  } catch (error) {
    console.log(error);
    
    return buildErrorResponse(res, error);
  }
};

const getGameModes = async (req, res) => {
  const gameId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(gameId)) {
    return res.status(400).json({ message: 'Invalid game id.', code: 'VALIDATION_ERROR' });
  }

  try {
    const modes = await GameMode.findAll({
      where: { game_id: gameId },
      order: [['created_at', 'ASC']],
    });
    return res.json(modes);
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};

const getGameRules = async (req, res) => {
  const gameId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(gameId)) {
    return res.status(400).json({ message: 'Invalid game id.', code: 'VALIDATION_ERROR' });
  }

  try {
    const rules = await GameRule.findAll({
      where: { game_id: gameId },
      order: [['created_at', 'ASC']],
    });
    return res.json(rules);
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};

const createGame = async (req, res) => {
  const name = normalizeName(req.body?.name);
  const gameIntent =
    typeof req.body?.game_intent === 'string' ? req.body.game_intent.trim() : '';
  const logoUrl = typeof req.body?.logo_url === 'string' ? req.body.logo_url.trim() : '';
  const rawStatus = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';
  const status = rawStatus || 'active';
  const slug = typeof req.body?.slug === 'string' ? req.body.slug.trim() : null;
  const themeColor = typeof req.body?.theme_color === 'string' ? req.body.theme_color.trim() : null;

  if (!isNonEmptyString(name)) {
    return res.status(400).json({ message: 'Game name is required.', code: 'VALIDATION_ERROR' });
  }

  if (!isNonEmptyString(gameIntent)) {
    return res.status(400).json({ message: 'game_intent is required.', code: 'VALIDATION_ERROR' });
  }

  if (!GAME_INTENT_REGEX.test(gameIntent)) {
    return res.status(400).json({
      message: 'game_intent must not include spaces and may only include letters, numbers, ., _, :, -.',
      code: 'VALIDATION_ERROR',
    });
  }

  if (!isValidUrl(logoUrl)) {
    return res.status(400).json({ message: 'Valid logo_url is required.', code: 'VALIDATION_ERROR' });
  }

  if (rawStatus && !GAME_STATUSES.has(status)) {
    return res.status(400).json({ message: 'Invalid game status.', code: 'VALIDATION_ERROR' });
  }

  const modeResult = buildModePayloads(req.body?.modes);
  if (modeResult.error) {
    return res.status(400).json({ message: modeResult.error.message, code: 'VALIDATION_ERROR' });
  }

  const ruleResult = buildRulePayloads(req.body?.rules);
  if (ruleResult.error) {
    return res.status(400).json({ message: ruleResult.error.message, code: 'VALIDATION_ERROR' });
  }

  if (status === 'active' && (modeResult.activeCount < 1 || ruleResult.activeCount < 1)) {
    return res.status(400).json({
      message: 'Game is incomplete. Add at least one active mode and one active rule.',
      code: 'GAME_INCOMPLETE',
    });
  }

  const bannerUrl =
    typeof req.body?.banner_url === 'string' ? req.body.banner_url.trim() : null;
  const coverUrl =
    typeof req.body?.cover_url === 'string' ? req.body.cover_url.trim() : null;
  const promoVideoUrl =
    typeof req.body?.promo_video_url === 'string' ? req.body.promo_video_url.trim() : null;
  const androidStoreUrl =
    typeof req.body?.android_store_url === 'string' ? req.body.android_store_url.trim() : null;
  const iosStoreUrl =
    typeof req.body?.ios_store_url === 'string' ? req.body.ios_store_url.trim() : null;
  const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : null;

  const isFeatured =
    typeof req.body?.is_featured === 'boolean' ? req.body.is_featured : false;
  const sortOrder =
    Number.isInteger(req.body?.sort_order) ? req.body.sort_order : 0;
  const supportsAndroid =
    typeof req.body?.supports_android === 'boolean' ? req.body.supports_android : true;
  const supportsIos =
    typeof req.body?.supports_ios === 'boolean' ? req.body.supports_ios : false;

  const transaction = await sequelize.transaction();
  try {
    const game = await Game.create(
      {
        name,
        logo_url: logoUrl,
        status,
        game_intent: gameIntent,
        description: typeof req.body?.description === 'string' ? req.body.description.trim() : null,
        banner_url: bannerUrl || null,
        cover_url: coverUrl || null,
        promo_video_url: promoVideoUrl || null,
        is_featured: isFeatured,
        sort_order: sortOrder,
        slug: slug || null,
        theme_color: themeColor || null,
        metadata,
        android_store_url: androidStoreUrl || null,
        ios_store_url: iosStoreUrl || null,
        supports_android: supportsAndroid,
        supports_ios: supportsIos,
      },
      { transaction }
    );

    const createdModes = await GameMode.bulkCreate(
      modeResult.payloads.map((mode) => ({ ...mode, game_id: game.id })),
      { transaction, returning: true }
    );

    const createdRules = await GameRule.bulkCreate(
      ruleResult.payloads.map((rule) => ({ ...rule, game_id: game.id })),
      { transaction, returning: true }
    );

    await transaction.commit();

    return res.status(201).json({
      message: 'Game created successfully.',
      game,
      modes: createdModes,
      rules: createdRules,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return buildErrorResponse(res, error);
  }
};

const updateGameStatus = async (req, res) => {
  const rawStatus = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';
  if (!rawStatus || !GAME_STATUSES.has(rawStatus)) {
    return res.status(400).json({ message: 'Invalid game status.', code: 'VALIDATION_ERROR' });
  }

  try {
    const game = await Game.findByPk(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    if (rawStatus === 'active') {
      const hasLogo = isNonEmptyString(game.logo_url);
      const hasGameIntent = isNonEmptyString(game.game_intent);
      const activeModeCount = await GameMode.count({
        where: { game_id: game.id, status: 'active' },
      });
      const activeRuleCount = await GameRule.count({
        where: { game_id: game.id, is_active: true },
      });

      if (!hasLogo || !hasGameIntent || activeModeCount < 1 || activeRuleCount < 1) {
        return res.status(400).json({
          message: 'Game is incomplete. Add a logo, game intent, active mode, and active rule.',
          code: 'GAME_INCOMPLETE',
        });
      }

      await game.update({ status: rawStatus });
      return res.json({ message: 'Game status updated successfully.', game });
    }

    if (rawStatus === 'inactive') {
      const transaction = await sequelize.transaction();
      try {
        await game.update({ status: rawStatus }, { transaction });
        await GameMode.update(
          { status: 'inactive' },
          { where: { game_id: game.id }, transaction }
        );
        await GameRule.update(
          { is_active: false },
          { where: { game_id: game.id }, transaction }
        );
        await transaction.commit();
        return res.json({ message: 'Game deactivated successfully.', game });
      } catch (error) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return buildErrorResponse(res, error);
      }
    }

    await game.update({ status: rawStatus });
    return res.json({ message: 'Game status updated successfully.', game });
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};

const addGameModes = async (req, res) => {
  const gameId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(gameId)) {
    return res.status(400).json({ message: 'Invalid game id.', code: 'VALIDATION_ERROR' });
  }

  const modeResult = buildModePayloads(req.body?.modes);
  if (modeResult.error) {
    return res.status(400).json({ message: modeResult.error.message, code: 'VALIDATION_ERROR' });
  }

  try {
    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    const transaction = await sequelize.transaction();
    try {
      const createdModes = await GameMode.bulkCreate(
        modeResult.payloads.map((mode) => ({ ...mode, game_id: gameId })),
        { transaction, returning: true }
      );

      await transaction.commit();
      return res.status(201).json({
        message: 'Game modes created successfully.',
        modes: createdModes,
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return buildErrorResponse(res, error);
    }
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};

const updateGameMode = async (req, res) => {
  const update = {};

  if (typeof req.body?.name === 'string') {
    const name = normalizeName(req.body.name);
    if (!isNonEmptyString(name)) {
      return res.status(400).json({ message: 'Game mode name is required.', code: 'VALIDATION_ERROR' });
    }
    update.name = name;
  }

  if (typeof req.body?.status === 'string') {
    const status = req.body.status.trim().toLowerCase();
    if (!MODE_STATUSES.has(status)) {
      return res.status(400).json({ message: 'Invalid game mode status.', code: 'VALIDATION_ERROR' });
    }
    update.status = status;
  }

  if (typeof req.body?.how_to_play === 'string') {
    update.how_to_play = req.body.how_to_play.trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ message: 'No updates provided.', code: 'VALIDATION_ERROR' });
  }

  try {
    const gameMode = await GameMode.findByPk(req.params.id);
    if (!gameMode) {
      return res.status(404).json({ message: 'Game mode not found.' });
    }

    await gameMode.update(update);
    return res.json({ message: 'Game mode updated successfully.', game_mode: gameMode });
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};

const addGameRules = async (req, res) => {
  const gameId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(gameId)) {
    return res.status(400).json({ message: 'Invalid game id.', code: 'VALIDATION_ERROR' });
  }

  const ruleResult = buildRulePayloads(req.body?.rules);
  if (ruleResult.error) {
    return res.status(400).json({ message: ruleResult.error.message, code: 'VALIDATION_ERROR' });
  }

  try {
    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    const transaction = await sequelize.transaction();
    try {
      const createdRules = await GameRule.bulkCreate(
        ruleResult.payloads.map((rule) => ({ ...rule, game_id: gameId })),
        { transaction, returning: true }
      );

      await transaction.commit();
      return res.status(201).json({
        message: 'Game rules created successfully.',
        rules: createdRules,
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return buildErrorResponse(res, error);
    }
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};

const updateGameRule = async (req, res) => {
  const update = {};

  if (typeof req.body?.title === 'string') {
    const title = normalizeName(req.body.title);
    if (!isNonEmptyString(title)) {
      return res.status(400).json({ message: 'Rule title is required.', code: 'VALIDATION_ERROR' });
    }
    update.title = title;
  }

  if (typeof req.body?.content === 'string') {
    const content = req.body.content.trim();
    if (!isNonEmptyString(content)) {
      return res.status(400).json({ message: 'Rule content is required.', code: 'VALIDATION_ERROR' });
    }
    update.content = content;
  }

  if (typeof req.body?.is_active === 'boolean') {
    update.is_active = req.body.is_active;
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ message: 'No updates provided.', code: 'VALIDATION_ERROR' });
  }

  try {
    const gameRule = await GameRule.findByPk(req.params.id);
    if (!gameRule) {
      return res.status(404).json({ message: 'Game rule not found.' });
    }

    await gameRule.update(update);
    return res.json({ message: 'Game rule updated successfully.', game_rule: gameRule });
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};

module.exports = {
  getGames,
  getGameModes,
  getGameRules,
  createGame,
  updateGameStatus,
  addGameModes,
  updateGameMode,
  addGameRules,
  updateGameRule,
};
