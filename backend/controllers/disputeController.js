const getDispute = async (req, res, next) => {
  try {
    const { id } = req.params;

    const dispute = await Dispute.findByPk(id, {
      include: [
        {
          model: Match,
          include: [
            {
              model: TournamentParticipant,
              as: 'participant1',
              include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
            },
            {
              model: TournamentParticipant,
              as: 'participant2',
              include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
            },
            {
              model: Tournament,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: User,
          as: 'raised_by',
          attributes: ['id', 'username']
        },
        {
          model: User,
          as: 'resolved_by',
          attributes: ['id', 'username']
        }
      ]
    });

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found.' });
    }

    res.json(dispute);
  } catch (error) {
    next(error);
  }
};