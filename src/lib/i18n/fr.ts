export const fr: Record<string, string> = {
  // Navigation
  dashboard: "Pratique",
  manager: "Banque de questions",
  llm: "Analyse LLM",
  settings: "Paramètres",

  // Sidebar actions
  addList: "Nouvelle liste",
  importQuestions: "Importer des questions",
  importBackup: "Importer la configuration",
  exportList: "Exporter la liste",
  exportBackup: "Exporter la configuration",
  questionSearch: "Rechercher",
  questionList: "Listes",
  questionCount: "Q",
  clearAllData: "Supprimer toutes les données",
  brandTagline: "Banque de quiz frontend",

  // Practice
  submit: "Soumettre",
  submitAll: "Tout soumettre",
  next: "Suivant",
  previous: "Précédent",
  redoWrong: "Refaire les erreurs",
  exportWrong: "Exporter les erreurs",
  allQuestions: "Complet",
  singleQuestion: "Unique",
  practice: "Pratique",
  memorize: "Mémoriser",
  autoNext: "Auto suivant",
  autoNextPause: "Voir le résultat",
  autoNextScopeLabel: "Si incorrect",
  autoNextScopeAll: "Avancer",
  autoNextScopeCorrect: "Rester si faux",
  sort: "Trier",
  manual: "Ordre original",
  random: "Aléatoire",
  name: "Par nom",
  type: "Par type (ordre d'origine)",
  typeRandom: "Par type (aléatoire)",
  typeOrderLabel: "Ordre des types",
  moveUp: "Monter",
  moveDown: "Descendre",
  correctRate: "Taux de réussite",
  avgTime: "Temps moyen",
  finished: "Soumis",
  wrongCount: "Erreurs",
  explanation: "Explication",
  answer: "Réponse",
  noExplanation: "Pas d'explication",
  notSet: "Non défini",
  correct: "Correct",
  incorrect: "Incorrect",
  shouldSelect: "À choisir",
  hint: "Indice",
  inputAnswer: "Entrez votre réponse",
  practiceSettings: "Paramètres",
  eachSubmit: "Par question",
  paperSubmit: "Tout à la fois",
  quickNav: "Navigation rapide",
  progress: "Progrès",
  stats: "Statistiques",
  revealImmediate: "Afficher la réponse immédiatement",
  revealEnd: "Afficher la réponse à la fin",
  revealTiming: "Affichage des réponses",
  blankPlaceholder: "Champ {0}",
  shortPlaceholder: "Réponse {0}",
  wrongPractice: "Pratique erreurs",
  sessionAccuracy: "Précision",
  sessionTime: "Temps",
  sessionSubmitted: "Soumis",
  sessionWrong: "Erreurs",
  tempStats: "Stats de session",
  tempStatsHint: "Réinitialisé à l'entrée d'un nouveau set d'erreurs",
  controls: "Contrôles",
  memorizeHint: "Le mode mémorisation affiche directement les réponses et explications.",
  practiceHint: "Les soumissions enregistrent la précision, les erreurs et le temps moyen.",
  showSidebar: "Afficher la barre latérale",
  hideSidebar: "Masquer la barre latérale",
  noQuestions: "Pas de questions",
  noQuestionsHint: "Importez un fichier JSON ou ajoutez des questions dans la banque.",

  // Manager
  addQuestion: "Ajouter",
  save: "Enregistrer",
  delete: "Supprimer",
  duplicate: "Dupliquer",
  cancel: "Annuler",
  confirm: "Confirmer",
  managerDesc: "Ajoutez, supprimez, modifiez et recherchez des questions.",
  selfFill: "Auto-complétion AI",
  llmFill: "LLM compléter réponses",
  filling: "Complétion...",
  clearListAttempts: "Effacer les données de pratique",
  deleteList: "Supprimer la liste",
  listDesc: "Description de la liste",
  noPrompt: "Pas de question",
  llmFilling: "LLM en cours...",
  waitingAI: "En attente de l'IA...",
  selectToEdit: "Sélectionner pour éditer",
  selectToEditHint: "Cliquez sur une question ou ajoutez-en une pour commencer l'édition.",
  configureLlm: "Configurer LLM",
  configureLlmHint: "Configurez les paramètres LLM avant d'utiliser la complétion.",
  saveAndContinue: "Enregistrer et continuer",
  selectFillContent: "Sélectionner le contenu",
  selectFillHint: "Choisissez ce que le LLM doit compléter :",
  fillAnswerOnly: "Réponses uniquement",
  fillExplanationOnly: "Explications uniquement",
  fillBoth: "Les deux",
  orDivider: "ou",
  selfFillButton: "Auto-complétion (votre propre IA)",
  editQuestion: "Éditer la question",
  questionType: "Type",
  title: "Titre",
  prompt: "Énoncé",
  options: "Options",
  answerSepHint: "Réponse (utiliser | pour alternatives)",
  answerFieldsLabel: "Champs de réponse (utiliser | pour alternatives)",
  selectAnswerHint: "Cliquer pour sélectionner la bonne réponse",

  // Self-fill dialog
  selfFillTitle: "Auto-complétion réponses/explications",
  selfFillDesc:
    "Copiez le prompt ci-dessous et envoyez-le à votre IA, puis collez le JSON retourné.",
  fillContent: "Contenu :",
  answerAndExplanation: "Réponse + Explication",
  answerOnly: "Réponse seule",
  explanationOnly: "Explication seule",
  questionsOnly: "Questions seules",
  copied: "Copié",
  copy: "Copier",
  downloadTxt: "Télécharger TXT",
  longTextWarning:
    "Contenu supérieur à 10k caractères. Téléchargez en TXT et envoyez en pièce jointe.",
  pasteOrUploadJson: "Collez ou téléchargez le JSON retourné par l'IA",
  uploadJson: "Télécharger JSON",
  validateAndApply: "Valider et appliquer",

  // Self-generate dialog
  selfGenerateTitle: "Auto-génération JSON de questions",
  selfGenerateDescWithRaw:
    "Copiez le prompt (avec texte brut) et envoyez à votre IA, puis collez le JSON dans le panneau droit.",
  selfGenerateDesc:
    "Copiez le prompt et envoyez à votre IA, puis collez le JSON dans le panneau droit.",
  generateContent: "Contenu généré :",
  answerExplanationQuestions: "Réponse + Explication + Questions",
  answerQuestions: "Réponse + Questions",
  explanationQuestions: "Explication + Questions",
  usageSteps: "Étapes",
  step1: "Copiez le prompt ci-dessous",
  step2: "Envoyez à n'importe quelle IA (ChatGPT, Claude, etc.)",
  step3: "Collez le JSON retourné dans le panneau droit",
  step4: "Cliquez sur « Valider et enregistrer » pour importer",
  close: "Fermer",

  // LLM page
  llmDesc:
    "Convertissez des questions non formatées en JSON standard. Peut compléter réponses, explications et importer directement.",
  selfParse: "Auto-analyse",
  modelNotSet: "Modèle non défini",
  llmConfig: "Config LLM",
  provider: "Fournisseur",
  model: "Modèle",
  apiUrl: "URL API",
  apiKey: "Clé API",
  selectModel: "Sélectionner le modèle",
  fetchModelListFirst: "Récupérez d'abord la liste des modèles",
  clear: "Effacer",
  restore: "Restaurer",
  fetchingModels: "Récupération...",
  fetchModelList: "Récupérer la liste",
  fetchModelListTitle: "Récupérer les modèles disponibles",
  hide: "Masquer",
  show: "Afficher",
  testing: "Test en cours...",
  testConnection: "Tester la connexion",
  generateContentLabel: "Contenu généré",
  done: "Terminé",
  uploadTextFile: "Télécharger un fichier texte",
  rawTextPlaceholder: "Collez le texte de questions non formaté...",
  edit: "Modifier",
  importToCurrentList: "Importer dans la liste actuelle",
  createNewList: "Nouvelle liste",
  validateAndSave: "Valider et enregistrer",
  waitingForParse: "En attente",
  waitingForParseHint:
    "Utilisez l'analyse intégrée à gauche, ou cliquez sur « Auto-analyse » pour coller du JSON.",
  manualJsonHint:
    "Collez le JSON ci-dessous ou téléchargez un fichier, puis cliquez sur « Valider et enregistrer ».",
  overwriteConfirmTitle: "Confirmer l'écrasement",
  overwriteConfirmDesc:
    "Le panneau droit a du contenu. L'analyse intégrée va l'écraser. Continuer ?",
  confirmOverwrite: "Écraser",
  parsedQuestions: "Résultats",
  parse: "Analyser",
  directImport: "Importer",
  exportJson: "Exporter JSON",
  jsonPreview: "JSON",
  questionPreview: "Aperçu",
  addOption: "Ajouter une option",
  deleteOption: "Supprimer l'option",
  addQuestionBtn: "Ajouter une question",
  booleanOptionsHint: "Options (vrai/faux : T/F fixe)",
  deleteQuestion: "Supprimer la question",

  // Import dialogs
  importTitle: "Importer des questions",
  selectSource: "Sélectionnez la source :",
  uploadLocalJson: "Télécharger un fichier JSON local",
  inputJsonUrl: "Entrer une URL JSON",
  back: "Retour",
  importing: "Importation...",
  import: "Importer",
  addToWhere: "Où ajouter ?",
  addToCurrentList: "Ajouter à la liste actuelle",
  createNewListBtn: "Créer une nouvelle liste",
  mergeToOtherList: "Fusionner dans une autre liste…",
  selectTargetList: "Sélectionner la liste cible",
  currentListTag: "Actuelle",

  // Backup import dialog
  importConfigTitle: "Importer la configuration",
  mergeData: "Fusionner avec les données existantes",
  overwriteConfig: "Écraser la configuration actuelle",
  confirmOverwriteTitle: "Confirmer l'écrasement",
  overwriteWarning:
    "L'écrasement supprimera toutes les listes, enregistrements et paramètres actuels. Cette action est irréversible.",
  typeToConfirm: "Tapez « 确认覆盖 » pour continuer :",
  overwrite: "Écraser",

  // Reset dialog
  resetTitle: "Supprimer toutes les données",
  resetWarning:
    "Cela supprimera toutes les listes, enregistrements et paramètres du navigateur. Irréversible. Tapez « 确认 » pour continuer.",
  resetPlaceholder: "Tapez « 确认 »",

  // Onboarding
  welcomeTitle: "Bienvenue sur PassLoop",
  welcomeDesc:
    "PassLoop est un système de quiz frontend. Toutes les données sont stockées dans votre navigateur. Guide rapide :",
  onboarding1:
    "Sélectionner/créer une liste — Changez de liste dans la barre latérale, + pour en créer une nouvelle.",
  onboarding2:
    "Importer des questions — Cliquez sur « Importer » pour charger un JSON, ou ajoutez manuellement.",
  onboarding3:
    "Analyse LLM — Collez du texte non formaté et convertissez en format standard avec le LLM.",
  onboarding4:
    "Pratique — Répondez en mode pratique. Le système enregistre précision, temps et erreurs. Paramètres en haut à droite.",
  onboarding5:
    "Révision des erreurs — Après avoir terminé, créez une liste d'erreurs pour continuer à pratiquer.",
  onboardingTip:
    "Astuce : Les données sont stockées localement. Vider le cache supprime les données. Exportez régulièrement la configuration.",
  startUsing: "Commencer",

  // Debug
  debugMode: "Mode Debug",
  debugEnabled: "Mode debug activé. Logs dans la console.",
  debugDisabled: "Mode debug désactivé.",
  enableDebug: "Activer Debug",
  disableDebug: "Désactiver Debug",

  // Common
  theme: "Thème",
  language: "Langue",
  expandSidebar: "Étendre la barre latérale",
  collapseSidebar: "Réduire la barre latérale",
  expandListPanel: "Étendre le panneau de listes",
  collapseListPanel: "Réduire le panneau de listes",

  // Hardcoded UI strings
  confirmTitle: "Confirmer",
  confirmAction: "OK",
  totalQuestions: "{0} questions au total — où les ajouter ?",
  addToListName: "Ajouter à la liste actuelle « {0} »",
  selectImportSource: "Choisir la source :",
  selectBackupImportSource: "Choisir la source de configuration :",
  uploadLocalJsonFile: "Télécharger un fichier JSON local",
  importFromUrl: "Importer un JSON depuis une URL",
  jsonFileUrl: "URL du fichier JSON",
  corsProxyNote:
    "Les requêtes seront transmises via le proxy CORS configuré dans les paramètres LLM (si configuré).",
  downloading: "Téléchargement…",
  detectedLists:
    "{0} listes et {1} enregistrements de pratique détectés. Choisir la méthode d'import :",
  mergeToExisting: "Fusionner avec les données existantes",
  overwriteCurrentConfig: "Écraser la configuration actuelle",
  confirmOverwriteHeader: "Confirmer l'écrasement",
  overwriteWarningText:
    "L'écrasement supprimera toutes les listes, enregistrements et paramètres actuels, remplacés par le contenu importé. Irréversible.",
  typeConfirmOverwrite: "Tapez « confirmer » pour continuer :",
  confirmOverwriteKeyword: "confirmer",
  resetKeyword: "confirmer",
  resetWarningText:
    "Toutes les listes, enregistrements et paramètres du navigateur seront supprimés. Irréversible. Tapez « confirmer » pour continuer.",
  resetPlaceholderText: "Tapez « confirmer »",
  clearAllDataAction: "Supprimer toutes les données",
  githubRepo: "Dépôt GitHub",
  welcomeStarNote: "Stars et retours bienvenus.",
  startUsingBtn: "Commencer",

  // Onboarding (new multi-step)
  obTitleWelcome: "Bienvenue sur PassLoop",
  obPrev: "Précédent",
  obNext: "Suivant",
  obWelcome1:
    "PassLoop est une plateforme de quiz locale, entièrement frontend. Toutes les données sont stockées dans votre navigateur — aucun backend requis.",
  obWelcome2:
    "Cinq types de questions pris en charge : choix unique, choix multiple, vrai/faux, texte à trous et réponse courte.",
  obWelcome3:
    "Les pages suivantes présentent toutes les fonctionnalités. Naviguez avec les flèches, ou fermez à tout moment pour commencer.",

  obTitleList: "Gestion des listes",
  obList1:
    "La barre latérale affiche toutes vos listes de questions. Cliquez pour changer la liste active.",
  obList2:
    "Cliquez sur + pour créer une nouvelle liste vide. Double-cliquez sur le nom pour renommer.",
  obList3:
    "Dans la page « Banque de questions », vous pouvez supprimer des listes ou modifier leurs descriptions.",
  obList4:
    "Sur mobile, utilisez la barre de navigation inférieure. Appuyez sur le bouton + central pour plus d'options.",

  obTitleImport: "Importer des questions",
  obImport1:
    "Cliquez sur « Importer des questions » dans la barre latérale. Deux méthodes : fichier JSON local ou URL distante.",
  obImport2:
    "Lors de l'import, choisissez « Ajouter à la liste actuelle » ou « Créer une nouvelle liste ».",
  obImport3:
    "« Importer la config » restaure une sauvegarde complète (listes, historique, paramètres) en mode fusion ou écrasement.",
  obImport4:
    'Format JSON : { "name": "Nom de la liste", "questions": [{ "title": "...", "type": "single", "body": "...", "options": [...], "answer": [...] }] }',

  obTitleManager: "Banque de questions",
  obManager1:
    "Dans la page « Banque de questions », ajoutez, modifiez et supprimez des questions manuellement.",
  obManager2:
    "Définissez le titre, l'énoncé, les options, la bonne réponse et l'explication pour chaque question.",
  obManager3:
    "« Compléter par LLM » utilise l'IA pour générer automatiquement réponses et explications (configuration LLM requise).",
  obManager4:
    "« Auto-compléter » : copiez le prompt vers votre propre IA, puis collez le JSON retourné.",

  obTitleLlm: "Analyse LLM",
  obLlm1:
    "Dans la page « Analyse LLM », collez du texte non formaté (notes de cours, OCR, etc.) et l'IA le convertit en JSON quiz standard.",
  obLlm2:
    "Choisissez le mode de contenu : réponse + explication, réponse seule, explication seule, ou questions seules.",
  obLlm3:
    "Mode « Auto-analyse » : copiez le prompt généré vers une IA externe (ChatGPT, Claude, etc.), puis collez le JSON en retour.",
  obLlm4:
    "Après l'analyse, importez directement dans la liste actuelle ou créez une nouvelle liste. Vous pouvez aussi modifier les résultats avant d'importer.",
  obLlm5:
    "Configurez les fournisseurs dans « Config LLM » de la barre latérale. Supporte OpenAI, Anthropic, Gemini et toute API compatible.",

  obTitlePractice: "Mode pratique",
  obPractice1:
    "Dans « Pratique », sélectionnez une liste pour commencer. Mode « Pratique » (soumettre pour vérifier) ou mode « Mémorisation » (réponses affichées directement).",
  obPractice2:
    "Modes de navigation : « Une par une » pour répondre séquentiellement, ou « Examen » pour tout soumettre d'un coup.",
  obPractice3:
    "Paramètres en haut à droite : ordre de tri (original/aléatoire/par nom/par type), question suivante auto, moment de révélation, etc.",
  obPractice4:
    "Le panneau latéral affiche la précision, le temps moyen, la progression et le nombre d'erreurs. La grille de navigation montre le statut par couleur.",
  obPractice5:
    "Après avoir terminé, un résumé apparaît avec les options : tout refaire, pratiquer les erreurs ou les exporter.",

  obTitleSettings: "Personnalisation",
  obSettings1:
    "La section Apparence des paramètres permet de changer le thème (7 thèmes : Mint, Paper, Lavender, Ocean, Rose, Night, Nord).",
  obSettings2: "5 langues supportées : chinois, English, 日本語, 한국어, Français.",
  obSettings3:
    "La barre latérale peut être réduite pour gagner de l'espace. Sur mobile, elle devient automatiquement une barre de navigation inférieure.",
  obSettings4:
    "Téléchargez la version hors-ligne (fichier HTML unique) pour utiliser sans connexion réseau.",

  obTitleData: "Données et sauvegarde",
  obData1:
    "Toutes les données sont dans le localStorage du navigateur. Vider le cache supprime toutes les données.",
  obData2:
    "« Exporter la config » sauvegarde toutes les listes, historiques et paramètres dans un fichier JSON.",
  obData3:
    "« Importer la config » restaure une sauvegarde en mode fusion (garder les données existantes) ou écrasement (tout remplacer).",
  obData4:
    "Exportez régulièrement vos sauvegardes, surtout avant de vider le cache ou changer d'appareil.",

  // LLM Config Modal
  llmConfigTitle: "Configuration LLM",
  proxySettingsTitle: "Paramètres du proxy",
  proxySettingsBtn: "Paramètres du proxy",
  providerLabel: "Fournisseur",
  modelLabel: "Modèle",
  apiUrlLabel: "URL de l'API",
  apiKeyLabel: "Clé API",
  apiKeyStorageHint:
    "Pour limiter l'exposition, la clé API reste seulement dans la session de page actuelle et doit être ressaisie après actualisation.",
  proxyToggleLabel: "Activer le proxy CORS",
  proxyDisabledHint: "Proxy désactivé, les requêtes vont directement à l'API",
  proxyUrlLabel: "URL du proxy CORS",
  proxyKeyLabel: "Clé du proxy",
  proxyKeyPlaceholder: "Laisser vide pour ne pas envoyer X-Proxy-Key",
  whatIsCorsProxy: "Qu'est-ce qu'un proxy CORS ?",
  proxyListTitle: "Liste des proxys",
  proxyListTest: "Tester",
  proxyListTestAll: "Tout tester",
  proxyListTesting: "Test en cours...",
  proxyListAlive: "Disponible",
  proxyListDead: "Indisponible",
  corsExplainTitle: "Pourquoi un proxy CORS ?",
  corsExplain1:
    "CORS (partage de ressources cross-origin) est une politique de sécurité du navigateur : quand une page web envoie des requêtes à un autre domaine, le navigateur vérifie si le serveur cible autorise cette origine.",
  corsExplain2:
    "PassLoop est une application frontend uniquement. Les requêtes LLM sont envoyées directement depuis le navigateur. Mais la plupart des API AI (OpenAI, Anthropic, etc.) n'autorisent pas les appels directs du navigateur et renvoient des erreurs CORS.",
  corsExplain3:
    "Un proxy CORS est un serveur intermédiaire qui reçoit votre requête, la transmet à l'API cible, et renvoie la réponse avec les en-têtes CORS appropriés.",
  corsExplain4: "En résumé :",
  corsExplainFlow: "Navigateur → Proxy → API AI → Proxy → Navigateur",
  corsExplain5:
    "Vous pouvez utiliser le proxy public par défaut, ou déployer votre propre proxy privé pour plus de stabilité et de sécurité.",
  viewDeployGuide: "Voir le guide de déploiement →",
  understood: "Compris",
  connectionSuccess: "Connexion réussie, modèle {0} disponible.",
  connectionFailed: "Test de connexion échoué.",
  noModelsFound: "Aucun modèle disponible trouvé.",
  modelsFound: "{0} modèles trouvés.",
  fetchModelsFailed: "Échec de la récupération de la liste des modèles.",
  answerPlusExplanation: "Réponse + Explication",
  onlyAnswer: "Réponse uniquement",
  onlyExplanation: "Explication uniquement",
  onlyQuestions: "Questions uniquement",

  // Provider Management
  providersTab: "Fournisseurs",
  scenariosTab: "Scénarios",
  providerNameLabel: "Nom",
  providerNamePlaceholder: "Nommez ce fournisseur",
  checkAvailability: "Vérifier la disponibilité",
  addProvider: "Ajouter un fournisseur",
  saveProvider: "Enregistrer",
  noProviders: "Aucun fournisseur ajouté",
  parseScenarioLabel: "Analyse de questions",
  fillScenarioLabel: "Remplir les réponses",
  notAssigned: "Non assigné",

  // LLM Page
  llmPageDesc:
    "Convertir des questions non formatées en JSON standard. Peut compléter réponses, explications et importer directement.",
  selfParseBtn: "Auto-analyse",
  parsing: "Analyse en cours",
  openAiCompatible: "Compatible OpenAI",
  waitingAiResponse:
    "En attente de réponse AI…\n\nLes modèles avec raisonnement doivent terminer avant d'afficher les résultats ici.",
  manualJsonHintText:
    "Collez le JSON retourné par l'AI ci-dessous, ou téléchargez un fichier JSON, puis cliquez sur « Valider et sauvegarder ». Vous pouvez aussi utiliser l'analyseur intégré à gauche.",
  charCount: "{0} caractères",
  uploadJsonBtn: "Télécharger JSON",
  pasteJsonPlaceholder:
    'Collez le JSON retourné par l\'AI…\n\n{\n  "name": "Nom de la liste",\n  "questions": [...]\n}',
  pleaseInputRawText: "Veuillez d'abord coller le texte des questions non formatées.",
  pleaseInputRawTextFirst: "Veuillez coller le texte des questions dans le champ ci-dessous.",
  llmParseComplete: "Analyse LLM terminée.",
  llmParseFailed: "Analyse LLM échouée.",
  jsonFormatError: "Le JSON analysé contient encore des erreurs de format. Veuillez corriger.",
  validateNoQuestions: "Validation échouée : aucune question dans la liste.",
  validateNoTitle: "Validation échouée : la question {0} n'a pas de titre.",
  validateFewOptions: "Validation échouée : la question {0} a moins de 2 options.",
  validatePassed: "Validation réussie, sauvegardé.",
  overwriteConfirmHeader: "Confirmer l'écrasement",
  overwriteConfirmContent:
    "Le panneau droit a du contenu existant. L'analyse LLM intégrée l'écrasera. Continuer ?",
  selectParseContentTitle: "Mode de contenu",
  selectParseContentDesc: "Choisissez ce que l'IA doit générer lors de l'analyse.",
  parseAnswerPlusExplanation: "Réponse + Explication",
  parseAnswerOnly: "Réponse uniquement",
  parseExplanationOnly: "Explication uniquement",
  parseQuestionsOnly: "Questions uniquement",
  confirmOverwriteBtn: "Écraser",
  importCurrentList: "Importer dans la liste actuelle",
  newList: "Nouvelle liste",
  validateAndSaveBtn: "Valider et sauvegarder",
  questionPreviewTab: "Aperçu",
  pleaseInputJson: "Veuillez d'abord coller du contenu JSON.",
  jsonParseSuccess: "JSON analysé avec succès.",
  jsonFormatErrorCheck: "Erreur de format JSON. Vérifiez le contenu.",
  waitingForParseTitle: "En attente",
  waitingForParseDesc:
    "Utilisez l'analyseur intégré à gauche, ou cliquez sur « Auto-analyse » pour coller du JSON manuellement.",

  // Parsed Questions Editor
  deleteQuestionTitle: "Supprimer la question",
  titleLabel: "Énoncé",
  optionsLabel: "Options",
  addOptionTitle: "Ajouter une option",
  deleteOptionTitle: "Supprimer l'option",
  booleanOptionsLabel: "Options (vrai/faux : T/F fixe)",
  booleanTrue: "Vrai",
  booleanFalse: "Faux",
  answerLabel: "Réponse",
  answerSepLabel: "Réponse (| pour blancs)",
  explanationLabel: "Explication",
  addQuestionBtnText: "Ajouter une question",

  // Manager Page
  managerPageDesc:
    "Ajouter, supprimer, modifier et rechercher des questions. Gérer le contenu de la liste.",
  selfAiFill: "Auto-complétion AI",
  llmFillBtn: "LLM compléter réponses",
  fillingStatus: "Complétion…",
  deleteCurrentList: "Supprimer la liste actuelle",
  listDescPlaceholder: "Description de la liste",
  noPromptText: "Pas de question",
  confirmDeleteQuestion: "Voulez-vous vraiment supprimer cette question ?",
  questionSaved: "Question sauvegardée.",
  noQuestionsInList: "Aucune question dans la liste actuelle.",
  fillLabel: "réponses",
  fillLabelExplanation: "explications",
  fillLabelBoth: "réponses et explications",
  llmFillDone: "LLM a complété les {0}.",
  llmFillFailed: "Complétion LLM échouée.",
  selectFillContentTitle: "Sélectionner le contenu",
  selectFillContentDesc:
    "Choisissez ce que le LLM doit compléter. S'applique à toutes les questions de la liste actuelle.",
  fillOnlyAnswer: "Réponses uniquement",
  fillOnlyExplanation: "Explications uniquement",
  fillBothBtn: "Les deux",
  orText: "ou",
  selfFillUseOwnAi: "Auto-complétion (votre propre AI)",
  selectToEditTitle: "Sélectionner pour modifier",
  selectToEditDesc: "Cliquez sur une question ou ajoutez-en une pour commencer l'édition.",
  editorTitle: "Éditeur",
  unsavedConfirm: "Modifications non sauvegardées. Voulez-vous quitter ?",
  listNameRequired: "Le nom de la liste ne peut pas être vide",
  modeProgressKept: "Mode changé. Votre progression est conservée.",
  selfFillApplied: "Résultats de complétion appliqués.",
  llmFillingStatus: "LLM en cours de complétion…",

  // Question Editor
  editQuestionTitle: "Modifier la question",
  questionTypeLabel: "Type",

  // Self-fill Dialog
  selfFillHeader: "Auto-complétion réponses/explications",
  selfFillInstruction:
    "Copiez le prompt et envoyez-le à votre AI. Collez le JSON retourné ci-dessous. Il sera appliqué à la liste actuelle après validation.",
  fillContentLabel: "Contenu à compléter :",
  promptWithCount: "Prompt ({0} questions, {1} caractères)",
  longTextWarningText:
    "Contenu dépassant 10 000 caractères. Téléchargez en TXT et envoyez en pièce jointe.",
  pasteOrUploadAiJson: "Collez ou téléchargez le JSON retourné par l'AI",
  validateAndApplyBtn: "Valider et appliquer",
  selfFillJsonEmpty: "Veuillez coller le JSON retourné par l'AI.",
  selfFillJsonInvalid:
    "Erreur de format JSON. Vérifiez que vous avez copié entièrement la sortie AI.",
  selfFillJsonNotArray: 'Le JSON doit être un tableau, ex. [{"id":"...","answer":"..."}].',
  selfFillNoMatch:
    "Aucune question correspondante. Vérifiez que les id du JSON correspondent aux id des questions ({0} questions au total).",

  // Self-generate Dialog
  selfGenerateHeader: "Auto-génération JSON de questions",
  selfGenerateDescWithRawText:
    "Le prompt inclut votre texte de questions. Copiez ou téléchargez et envoyez directement à votre AI, puis collez le JSON retourné dans le panneau droit.",
  selfGenerateDescNoRaw:
    "Sélectionnez le contenu à générer, copiez le prompt ci-dessous et envoyez à votre AI (ChatGPT, Claude, Gemini, etc.), incluez le texte des questions, puis collez le JSON généré dans la zone de résultats.",
  selfGenerateContentLabel: "Contenu à générer :",
  answerExplanationQuestionsOpt: "Réponse + Explication + Questions",
  answerQuestionsOpt: "Réponse + Questions",
  explanationQuestionsOpt: "Explication + Questions",
  onlyQuestionsOpt: "Questions uniquement",
  promptWithRawInfo: "Prompt (texte inclus, {0} caractères)",
  promptCharCount: "Prompt ({0} caractères)",
  usageStepsTitle: "Étapes :",
  stepCopyPrompt: "Copier ou télécharger le prompt ci-dessus",
  stepCopyPromptWithText:
    "Copier ou télécharger le prompt ci-dessus, et joindre le texte des questions",
  stepPasteToAi: "Coller le prompt complet dans votre conversation AI",
  stepPasteJson: "Une fois le JSON retourné, le coller dans le panneau droit",
  stepValidateAndSave: "Cliquer sur « Valider et sauvegarder » pour importer",
  closeBtn: "Fermer",

  // Practice Page
  practiceTitle: "Pratique",
  practiceMemorizeHint: "Le mode mémorisation affiche directement réponses et explications.",
  practicePracticeHint: "Les soumissions enregistrent précision, erreurs et temps moyen.",
  showInspector: "Afficher la barre latérale",
  hideInspector: "Masquer la barre latérale",
  allComplete: "Tout terminé",
  completionSummary: "{0} questions au total, {1} correctes, {2} incorrectes",
  redoAll: "Recommencer",
  practiceWrongBtn: "Pratiquer les erreurs",
  exportWrongBtn: "Exporter les erreurs",
  submitAllAnswers: "Tout soumettre",
  noQuestionsTitle: "Aucune question",
  noQuestionsDesc: "Importez un fichier JSON ou ajoutez des questions dans la banque de questions.",
  completionDialogTitle: "Terminé",
  statTotal: "Total",
  statCorrect: "Correct",
  statWrong: "Incorrect",
  statAccuracy: "Précision",
  statsAndNav: "Stats et navigation",

  // Topbar
  practiceSettingsTitle: "Paramètres de pratique",
  settingsTitle: "Paramètres",
  settingsDesc: "Gérez la pratique, l'apparence, l'IA/réseau et les sauvegardes.",
  appearanceSettings: "Apparence",
  aiNetworkSettings: "IA et réseau",
  dataSettings: "Données et sauvegarde",
  questionsUnit: "Q",

  // Sidebar
  sidebarBrandTagline: "Plateforme de quiz locale et légère",
  listSection: "Listes",
  llmConfigBtn: "Config LLM",
  features: "Fonctions",
  debugModeTitle: "Mode Debug",
  debugEnabledText: "Mode debug activé. Logs dans la console.",
  debugDisabledText: "Mode debug désactivé.",
  enableDebugBtn: "Activer Debug",
  disableDebugBtn: "Désactiver Debug",

  // Hooks & App-level messages
  allQuestionsFinished: "Toutes les questions sont terminées. Recommencez pour continuer.",
  submittedMsg: "Soumis.",
  answerCorrect: "Correct !",
  recordedAsWrong: "Enregistré comme erreur.",
  confirmEmptySubmit: "La question {0} n'a pas de réponse. Soumettre quand même ?",
  submitAllResult: "{0} questions soumises, {1} correctes.",
  confirmEmptySubmitAll: "La question {0} n'a pas de réponse. Tout soumettre quand même ?",
  dontAskThisSession: "Ne plus demander cette session",
  importFailed: "Échec de l'importation.",
  requestFailed: "Échec de la requête : {0}",
  urlImportFailed: "Échec de l'importation URL.",
  invalidUrlFormat: "Format d'URL invalide.",
  httpUrlOnly: "Seules les adresses http:// ou https:// sont prises en charge.",
  localNetworkUrlBlocked: "Les adresses locales ou intranet ne sont pas autorisées.",
  privateNetworkUrlBlocked: "Les adresses de réseau privé ne sont pas autorisées.",
  addedToCurrentList: "{0} questions ajoutées à la liste actuelle.",
  addedToListName: "{0} questions ajoutées à la liste « {1} ».",
  importedListName: "Liste importée",
  createdNewList: 'Nouvelle liste "{0}" créée avec {1} questions.',
  invalidBackupFile: "Le fichier n'est pas une configuration PassLoop valide.",
  urlBackupImportFailed: "Échec de l'importation de la configuration URL.",
  backupOverwritten: "Configuration écrasée et restaurée.",
  mergedLists: "{0} listes fusionnées.",
  remoteBackup: "Sauvegarde distante",
  remoteBackupTitle: "Sauvegarde et restauration distantes",
  remoteBackupDesc:
    "Téléversez la configuration actuelle vers votre serveur, ou restaurez une sauvegarde existante. La restauration demande toujours de fusionner ou d'écraser.",
  remoteServerUrl: "URL du serveur",
  remoteUsername: "Nom d'utilisateur",
  remotePassword: "Mot de passe",
  remoteBackupNote: "Note de sauvegarde",
  remoteBackupNotePlaceholder: "Exemple : avant de changer d'appareil",
  remoteUploadCurrent: "Téléverser la configuration",
  remoteUploading: "Téléversement...",
  remoteRefreshList: "Actualiser la liste",
  remoteLoadingList: "Chargement...",
  remoteBackupList: "Liste des sauvegardes",
  remoteBackupTotal: "{0} au total",
  remoteBackupListEmptyHint:
    "Renseignez l'URL du serveur, le nom d'utilisateur et le mot de passe, puis actualisez ou téléversez.",
  remoteBackupNoItems: "Aucune sauvegarde distante.",
  remoteBackupUntitled: "Sauvegarde sans titre",
  remoteRestoreBackup: "Restaurer cette sauvegarde",
  remoteBackupPage: "Page {0} / {1}",
  remoteBackupSecurityNote:
    "Seuls l'URL du serveur et le nom d'utilisateur sont mémorisés. Le mot de passe n'est pas stocké. Utilisez HTTPS en public.",
  remoteCredentialsRequired:
    "Renseignez d'abord l'URL du serveur, le nom d'utilisateur et le mot de passe.",
  remoteBackupUploaded: "Configuration téléversée vers la sauvegarde distante.",
  remoteBackupRegistered: "Utilisateur créé automatiquement et sauvegarde téléversée.",
  invalidRemoteServerUrl: "URL du serveur invalide. Utilisez une adresse http:// ou https://.",
  remoteUsernameRequired: "Saisissez un nom d'utilisateur.",
  remotePasswordRequired: "Saisissez un mot de passe.",
  remoteRequestFailed: "Échec de la requête de sauvegarde distante.",
  remoteInvalidResponse: "Le serveur distant a renvoyé une réponse invalide.",
  noWrongQuestions: "Pas de questions erronées dans cette liste.",
  confirmPracticeWrongList:
    "Créer une nouvelle liste à partir des erreurs actuelles et y basculer pour pratiquer. Continuer ?",
  wrongListSuffix: "{0} - Erreurs",
  wrongListExportDesc: "Questions erronées exportées depuis PassLoop basées sur l'historique.",
  wrongListCreateDesc: "Questions erronées générées depuis PassLoop basées sur l'historique.",
  wrongListCreated: 'Liste d\'erreurs "{0}" créée avec {1} questions.',
  confirmLeaveLlm:
    "Les résultats LLM n'ont pas été exportés ou importés. Les données seront perdues si vous quittez. Continuer ?",
  listNamePrompt: "Nom de la liste",
  defaultListName: "Liste {0}",
  confirmDeleteList: "Supprimer la liste supprimera aussi les questions et données. Continuer ?",
  defaultList: "Liste par défaut",
  listCreated: 'Liste "{0}" créée.',
  listDeleted: "Liste supprimée.",
  confirmClearAttempts: 'Effacer les données de "{0}" ? Les questions seront conservées.',
  attemptsCleared: "Données de la liste actuelle effacées.",
  clearAttemptData: "Effacer les données",
  importedToLocal: "Importé dans la liste locale.",
  defaultListDesc: "Importez des questions depuis un JSON ou ajoutez-les manuellement.",
  unnamedList: "Liste sans nom",
  selfFillPlaceholder: '[\\n  {"id": "question-id", "answer": "A", "explanation": "..."}\\n]',

  // LLM errors
  apiKeyRequired: "Veuillez saisir une API Key.",
  modelRequired: "Veuillez saisir un nom de modèle.",
  apiUrlRequired: "Veuillez saisir une adresse API.",
  networkCorsBlocked:
    "La requête réseau a échoué. Elle a peut-être été bloquée par la politique CORS du navigateur. Vérifiez que l'adresse API autorise l'accès cross-origin, ou utilisez un proxy CORS.",
  responseStreamUnreadable: "Impossible de lire le flux de réponse.",

  // Question types
  typeSingle: "Choix unique",
  typeMultiple: "Choix multiple",
  typeBoolean: "Vrai/Faux",
  typeBlank: "Texte à trous",
  typeShort: "Réponse courte",

  // question.ts fallbacks
  newQuestion: "Nouvelle question",
  questionN: "Question {0}",
  importedList: "Liste importée",
  jsonNoQuestions: "Aucun tableau de questions trouvé dans le JSON.",
  boolTrue: "Vrai",
  boolFalse: "Faux",

  // Offline version
  offlineVersion: "Version hors ligne",
  offlineDialogTitle: "Version hors ligne",
  offlineBuildTitle: "Fonctionnement",
  offlineBuildDesc:
    "Tout le code, les styles et les ressources sont regroupés dans un seul fichier .html. Aucun serveur ni connexion Internet nécessaire — double-cliquez pour ouvrir dans votre navigateur. Entièrement fonctionnel, identique à la version en ligne.",
  offlineStorageTitle: "Stockage des données",
  offlineStorageDesc:
    "Les données sont stockées dans le localStorage de votre navigateur, liées au navigateur actuel. Changer de navigateur ou effacer les données de navigation entraînera la perte de vos données. Nous recommandons d'exporter régulièrement votre configuration.",
  offlineUsageTitle: "Utilisation",
  offlineUsageStep1: "Téléchargez le fichier .html depuis GitHub Releases",
  offlineUsageStep2: "Double-cliquez pour ouvrir dans votre navigateur",
  offlineUsageStep3: "Commencez à utiliser (Chrome / Edge / Firefox recommandé)",
  offlineDownloadBtn: "Page de téléchargement",

  // Export confirm
  confirmExportBackup:
    "Le fichier exporté contient toutes vos questions, paramètres et la configuration LLM non sensible, mais pas les clés API ni les clés de proxy. Veuillez protéger votre vie privée et ne pas partager ce fichier avec des personnes non fiables. Continuer ?",

  // Debug
  simulateCrash: "Simuler un crash",
  showOnboarding: "Afficher le guide",
  createTestListBtn: "Créer une liste de test",
  testListName: "Liste de test (tous les types)",
  testListDesc: "Contient 2 questions de chaque type, pour les tests.",

  // UX confirmations
  confirmSwitchList: "Vous avez des réponses en cours. Changer de liste les effacera. Continuer ?",
  confirmTypeSwitch: "Changer le type effacera les options et la réponse. Continuer ?",
  viewStats: "Voir les stats",
  confirmLeaveManager: "Les modifications non enregistrées seront perdues. Continuer ?",
  reshuffle: "Remélanger",
  confirmSwitchToWrongList: "Liste d'erreurs créée. Y basculer maintenant ?",
  saveFailed:
    "Échec de l'enregistrement local (stockage peut-être plein). Les modifications restent en mémoire mais ne seront pas conservées.",
}
