const START_BONUS_REWARDS={
  first_play:'시작 골드 +10',
  first_kill:'시작 골드 +10',
  kill_100:'시작 골드 +30',
  kill_500:'시작 골드 +30',
  gold_1000:'시작 골드 +30',
  clear_act1:'시작 포션 +1',
  greedy_exists:'시작 골드 +10',
  lonely_intruder:'시작 골드 +10',
  one_hp_survive:'시작 최대 체력 +5',
  clear_game:'시작 트리포인트 +1'
};
const ACHIEVEMENT_RELIC_IDS=[
  'kijo_mask','viewer_slayer_mic','abstinence_chalice','chat_window_grinder',
  'hyechul_egg','yanggaeng_black_thread','seungwoo_broken_monitor','moving_afterimage',
  'clutch_heart','clip_dodge_instinct','collector_showcase','mythic_vault','curse_crown',
  'direction_compass','whale_card','no_spend_wallet','hardcore_transmitter','nohit_wings'
];
const ACHIEVEMENTS=[
  {id:'first_play',name:'첫 방송',desc:'처음 게임을 시작한다.',reward:'시작 골드 +10'},
  {id:'first_kill',name:'첫 처치',desc:'처음으로 시청자를 처치한다.',reward:'시작 골드 +10'},
  {id:'kill_100',name:'100 처치',desc:'누적 처치 100회를 달성한다.',reward:'시작 골드 +30'},
  {id:'kill_500',name:'500 처치',desc:'누적 처치 500회를 달성한다.',reward:'시작 골드 +30'},
  {id:'kill_1000',name:'1000 처치',desc:'누적 처치 1000회를 달성한다.',reward:'유물 해금: 시청자 학살자의 마이크'},
  {id:'kill_3000',name:'3000 처치',desc:'누적 처치 3000회를 달성한다.',reward:'유물 해금: 채팅창 분쇄기'},
  {id:'defeat_kijo',name:'키죠 격파',desc:'키죠를 쓰러뜨린다.',reward:'유물 해금: 키죠의 가면',spoiler:true,spoilerTerms:['키죠'],hiddenName:'??? 격파',hiddenDesc:'???를 쓰러뜨린다.',hiddenRelicName:'???의 가면'},
  {id:'defeat_hyechul',name:'혜철이 격파',desc:'혜철이를 쓰러뜨린다.',reward:'유물 해금: 혜철이의 알',spoiler:true,spoilerTerms:['혜철이'],hiddenName:'??? 격파',hiddenDesc:'???를 쓰러뜨린다.',hiddenRelicName:'???의 알'},
  {id:'defeat_yanggaeng',name:'박제인간 격파',desc:'박제인간을 쓰러뜨린다.',reward:'유물 해금: 박제인의 검은 실',spoiler:true,spoilerTerms:['박제인간','박제인'],hiddenName:'??? 격파',hiddenDesc:'???을 쓰러뜨린다.',hiddenRelicName:'???의 검은 실'},
  {id:'clear_act1',name:'1막 클리어',desc:'1막 보스를 격파한다.',reward:'시작 포션 +1'},
  {id:'clear_act2',name:'2막 클리어',desc:'2막 보스를 격파한다.',reward:'칭호 해금: 2막 돌파자'},
  {id:'defeat_seungwoo',name:'승우 격파',desc:'승우를 쓰러뜨린다.',reward:'유물 해금: 승우의 깨진 모니터',spoiler:true,spoilerTerms:['승우'],hiddenName:'??? 격파',hiddenDesc:'???를 쓰러뜨린다.',hiddenRelicName:'???의 깨진 모니터'},
  {id:'clear_game',name:'게임 클리어',desc:'최종 보스를 쓰러뜨리고 방송을 지킨다.',reward:'시작 트리포인트 +1'},
  {id:'hard_clear',name:'어려움 클리어',desc:'어려움 난이도로 게임을 클리어한다.',reward:'유물 해금: 하드코어 송출기'},
  {id:'no_potion_clear',name:'무포션 클리어',desc:'포션을 사용하지 않고 게임을 클리어한다.',reward:'유물 해금: 금욕의 성배'},
  {id:'no_hit_boss',name:'노히트 보스',desc:'보스 전투를 한 대도 맞지 않고 클리어한다.',reward:'유물 해금: 무피격의 날개'},
  {id:'no_hit_room',name:'무피격 방 클리어',desc:'일반 전투를 한 대도 맞지 않고 클리어한다.',reward:'유물 해금: 무빙의 잔상'},
  {id:'clutch_room',name:'딸피 클리어',desc:'체력 10% 이하로 방을 클리어한다.',reward:'유물 해금: 딸피의 심장'},
  {id:'one_hp_survive',name:'1 HP 생존',desc:'체력 1 상태로 생존하거나 방을 클리어한다.',reward:'시작 최대 체력 +5'},
  {id:'low_hit_clear',name:'클린 클리어',desc:'피격 5회 이하로 게임을 클리어한다.',reward:'유물 해금: 클립각 회피본능'},
  {id:'relic_10',name:'수집가',desc:'한 런에서 유물 10개를 보유한다.',reward:'유물 해금: 수집가의 진열장'},
  {id:'mythic_3',name:'신화 보관자',desc:'한 런에서 신화 유물 3개를 보유한다.',reward:'유물 해금: 신화 보관함'},
  {id:'curse_3_clear',name:'저주받은 클리어',desc:'저주 유물 3개 이상 보유하고 게임을 클리어한다.',reward:'유물 해금: 저주의 왕관'},
  {id:'first_keystone',name:'첫 키스톤',desc:'패시브 트리 키스톤을 1개 해금한다.',reward:'유물 해금: 방향성 나침반'},
  {id:'level_20',name:'레벨 20',desc:'한 런에서 20레벨을 달성한다.',reward:'칭호 해금: 성장형 스트리머'},
  {id:'berserk_kill',name:'분노를 잠재우다',desc:'광폭화된 적을 처치한다.',reward:'칭호 해금: 분노 진압자',spoiler:true,hiddenName:'???',hiddenDesc:'???'},
  {id:'legend_exists',name:'전설은 실존한다',desc:'첫 특성 선택지에서 전설 특성을 발견한다.',reward:'칭호 해금: 전설 목격자',spoiler:true,hiddenName:'???',hiddenDesc:'???'},
  {id:'mythic_exists',name:'신화는 실존한다',desc:'첫 특성 선택지에서 신화 특성을 발견한다.',reward:'칭호 해금: 신화 목격자',spoiler:true,hiddenName:'???',hiddenDesc:'???'},
  {id:'greedy_exists',name:'욕심은 실존한다',desc:'첫 특성 선택지에서 전설/신화 특성이 2개 이상 등장한다.',reward:'시작 골드 +10',spoiler:true,hiddenName:'???',hiddenDesc:'???'},
  {id:'chosen_broadcast',name:'선택받은 방송',desc:'첫 특성 선택지 3개가 모두 영웅 이상으로 등장한다.',reward:'칭호 해금: 선택받은 송출자',spoiler:true,hiddenName:'???',hiddenDesc:'???'},
  {id:'quick_room_clear',name:'한 방 컷',desc:'일반 전투를 10초 이내에 클리어한다.',reward:'칭호 해금: 순삭 전문가',spoiler:true,hiddenName:'???',hiddenDesc:'???'},
  {id:'lonely_intruder',name:'혼자 왔니?',desc:'존버 난입 시청자를 처치한다.',reward:'시작 골드 +10',spoiler:true,hiddenName:'???',hiddenDesc:'???'},
  {id:'gold_1000',name:'천 골드',desc:'한 런에서 골드 1000 이상을 보유한다.',reward:'시작 골드 +30'},
  {id:'shop_spend_1000',name:'큰손',desc:'상점에서 누적 1000G를 사용한다.',reward:'유물 해금: 큰손 카드'},
  {id:'no_shop_clear',name:'무소비 클리어',desc:'상점 구매 없이 게임을 클리어한다.',reward:'유물 해금: 무소비의 지갑'},
];
const ACHIEVEMENT_CATEGORY_ORDER=['progress','kills','bosses','combat','build','economy','clear'];
const ACHIEVEMENT_CATEGORY_LABELS={
  progress:'진행',
  kills:'처치',
  bosses:'보스',
  combat:'전투 도전',
  build:'빌드',
  economy:'경제',
  clear:'클리어 도전'
};
const ACHIEVEMENT_CATEGORIES={
  first_play:'progress',first_kill:'progress',clear_act1:'progress',clear_act2:'progress',level_20:'progress',
  kill_100:'kills',kill_500:'kills',kill_1000:'kills',kill_3000:'kills',
  defeat_kijo:'bosses',defeat_hyechul:'bosses',defeat_yanggaeng:'bosses',defeat_seungwoo:'bosses',
  no_hit_boss:'combat',no_hit_room:'combat',clutch_room:'combat',one_hp_survive:'combat',berserk_kill:'combat',legend_exists:'combat',mythic_exists:'combat',greedy_exists:'combat',chosen_broadcast:'combat',quick_room_clear:'combat',lonely_intruder:'combat',
  relic_10:'build',mythic_3:'build',curse_3_clear:'build',first_keystone:'build',
  gold_1000:'economy',shop_spend_1000:'economy',
  clear_game:'clear',hard_clear:'clear',no_potion_clear:'clear',low_hit_clear:'clear',no_shop_clear:'clear'
};
const TITLE_REWARDS={
  first_play:{id:'first_broadcast',name:'첫방송'},
  first_kill:{id:'rookie_hunter',name:'초보사냥꾼'},
  clear_act2:{id:'act2_breaker',name:'2막 돌파자'},
  level_20:{id:'growth_streamer',name:'성장형 스트리머'},
  berserk_kill:{id:'rage_suppressor',name:'분노 진압자'},
  legend_exists:{id:'legend_witness',name:'전설 목격자'},
  mythic_exists:{id:'mythic_witness',name:'신화 목격자'},
  chosen_broadcast:{id:'chosen_streamer',name:'선택받은 송출자'},
  quick_room_clear:{id:'speed_clearer',name:'순삭 전문가'},
  kill_3000:{id:'chat_grinder',name:'채팅 분쇄자'},
  defeat_kijo:{id:'mask_breaker',name:'가면 파쇄자'},
  defeat_hyechul:{id:'egg_hunter',name:'알 사냥꾼'},
  defeat_yanggaeng:{id:'black_thread_cutter',name:'검은 실 절단자'},
  defeat_seungwoo:{id:'monitor_breaker',name:'모니터 브레이커'},
  clear_game:{id:'broadcast_survivor',name:'방송생존자'},
  hard_clear:{id:'hardcore_broadcaster',name:'하드코어 송출자'},
  no_potion_clear:{id:'dry_clearer',name:'무포션 수행자'},
  no_hit_boss:{id:'nohit_master',name:'노히트장인'},
  no_hit_room:{id:'moving_master',name:'무빙 장인'},
  clutch_room:{id:'clutch_survivor',name:'딸피 생존자'},
  low_hit_clear:{id:'clip_dodger',name:'클립각 회피자'},
  relic_10:{id:'showcase_owner',name:'진열장 주인'},
  mythic_3:{id:'mythic_keeper',name:'신화 보관자'},
  curse_3_clear:{id:'curse_crowned',name:'저주받은 왕관'},
  shop_spend_1000:{id:'big_spender',name:'큰손 후원자'},
  no_shop_clear:{id:'no_spend_ascetic',name:'무소비 수행자'}
};
const TITLE_LIST=Object.values(TITLE_REWARDS);
const RELIC_REWARDS={
  defeat_kijo:'kijo_mask',
  kill_1000:'viewer_slayer_mic',
  no_potion_clear:'abstinence_chalice',
  kill_3000:'chat_window_grinder',
  defeat_hyechul:'hyechul_egg',
  defeat_yanggaeng:'yanggaeng_black_thread',
  defeat_seungwoo:'seungwoo_broken_monitor',
  no_hit_room:'moving_afterimage',
  clutch_room:'clutch_heart',
  low_hit_clear:'clip_dodge_instinct',
  relic_10:'collector_showcase',
  mythic_3:'mythic_vault',
  curse_3_clear:'curse_crown',
  first_keystone:'direction_compass',
  shop_spend_1000:'whale_card',
  no_shop_clear:'no_spend_wallet',
  hard_clear:'hardcore_transmitter',
  no_hit_boss:'nohit_wings'
};

if (typeof window !== "undefined") {
  window.START_BONUS_REWARDS = START_BONUS_REWARDS;
  window.ACHIEVEMENT_RELIC_IDS = ACHIEVEMENT_RELIC_IDS;
  window.ACHIEVEMENTS = ACHIEVEMENTS;
  window.ACHIEVEMENT_CATEGORY_ORDER = ACHIEVEMENT_CATEGORY_ORDER;
  window.ACHIEVEMENT_CATEGORY_LABELS = ACHIEVEMENT_CATEGORY_LABELS;
  window.ACHIEVEMENT_CATEGORIES = ACHIEVEMENT_CATEGORIES;
  window.TITLE_REWARDS = TITLE_REWARDS;
  window.TITLE_LIST = TITLE_LIST;
  window.RELIC_REWARDS = RELIC_REWARDS;
}
