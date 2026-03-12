(function () {
    var QUESTION_TYPE_LABELS = {
        multiple_choice: 'Choose the best answer:',
        true_false: 'Is this statement true or false?',
        cloze_choice: 'Fill in the missing word:',
        best_application: 'Which response best fits this teaching?'
    };

    var TYPE_TO_CATEGORY = {
        commandment: 'Obedience',
        promise: 'Trust',
        invitation: 'Hope',
        warning: 'Discernment'
    };

    class DiscipleshipMissionManager {
        constructor() {
            this._packCache = {};
        }

        async loadPack(packId) {
            if (this._packCache[packId]) {
                return this._packCache[packId];
            }

            var response = await fetch('/content-maker/packs/' + encodeURIComponent(packId) + '.json');
            if (!response.ok) {
                throw new Error('Failed to load discipleship pack: ' + packId);
            }

            var pack = await response.json();
            this._packCache[packId] = pack;
            return pack;
        }

        async buildMissionOverride(mission) {
            if (!mission || mission.type !== 'discipleship' || !mission.packId) {
                return null;
            }

            var pack = await this.loadPack(mission.packId);
            var unitIds = Array.isArray(mission.unitIds) ? mission.unitIds : [];
            var selectedUnits = pack.units.filter(function (unit) {
                return unitIds.includes(unit.id);
            });

            var entries = [];
            selectedUnits.forEach(function (unit) {
                var category = unit.gameplayCategory || TYPE_TO_CATEGORY[unit.type] || 'Discipleship';
                var passages = Array.isArray(unit.passages) ? unit.passages : [];
                var firstPassage = passages[0] || { reference: unit.title, text: unit.summary || unit.focus?.statement || unit.title };
                (unit.questions || []).forEach(function (question, questionIndex) {
                    entries.push({
                        Id: unit.id + ':' + (question.id || ('q' + questionIndex)),
                        Reference: firstPassage.reference,
                        Text: firstPassage.text,
                        Category: category,
                        discipleshipQuestion: question,
                        discipleshipContent: {
                            contentId: unit.id,
                            title: unit.title,
                            type: unit.type,
                            summary: unit.summary || '',
                            focus: unit.focus || null,
                            contextCard: unit.contextCard || null,
                            reflection: unit.reflection || null,
                            passages: passages,
                            mission: unit.mission || null
                        }
                    });
                });
            });

            var organized = {};
            entries.forEach(function (entry) {
                if (!organized[entry.Category]) {
                    organized[entry.Category] = [];
                }
                organized[entry.Category].push(entry);
            });

            return {
                packId: pack.id,
                missionId: mission.id,
                missionName: mission.name,
                entries: entries,
                organizedVerses: organized,
                allQualities: Object.keys(organized),
                questionTypes: Array.isArray(pack.questionTypes) ? pack.questionTypes.slice() : [],
                packTitle: pack.title
            };
        }

        buildQuizFromQuestion(entry) {
            if (!entry || !entry.discipleshipQuestion) {
                return null;
            }

            var question = entry.discipleshipQuestion;
            var options = Array.isArray(question.options) ? question.options.slice() : [];
            var mappedOptions;

            if (question.type === 'true_false') {
                mappedOptions = [
                    { text: 'TRUE', isCorrect: question.correctAnswer === true },
                    { text: 'FALSE', isCorrect: question.correctAnswer === false }
                ];
            } else {
                mappedOptions = options.map(function (optionText, index) {
                    return {
                        text: optionText,
                        isCorrect: index === question.correctIndex
                    };
                });
            }

            var correctAnswer = '';
            mappedOptions.forEach(function (option) {
                if (option.isCorrect) {
                    correctAnswer = option.text;
                }
            });

            return {
                mode: question.type || 'multiple_choice',
                promptText: question.prompt || '',
                questionLabel: QUESTION_TYPE_LABELS[question.type] || 'Choose the best answer:',
                options: mappedOptions,
                correctAnswer: correctAnswer,
                explanation: question.explanation || '',
                verseReference: entry.Reference,
                contentCategory: entry.Category,
                answerRevealText: entry.Text,
                discipleshipContent: entry.discipleshipContent || null
            };
        }
    }

    var instance = new DiscipleshipMissionManager();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { DiscipleshipMissionManager, discipleshipMissionManager: instance };
    } else if (typeof window !== 'undefined') {
        window.DiscipleshipMissionManager = DiscipleshipMissionManager;
        window.discipleshipMissionManager = instance;
    }
})();
