import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Language = 'zh' | 'en';
const preferenceKey = 'deep-sky-language';

const english: Record<string, string> = {
  这台设备的星空档案: 'Your sky archive on this device',
  '保存在此浏览器 · 可导出备份': 'Saved in this browser · Export a backup',
  '记录仅保存在此浏览器 · 清除浏览器数据前请导出备份':
    'Saved only in this browser · Export before clearing browser data',
  '私人手记 · 保存在此浏览器': 'Private notes · Saved in this browser',
  '无法读取此浏览器的记录。请允许本站使用浏览器存储后重试。':
    'Unable to read records. Allow browser storage for this site and retry.',
  '浏览器中的记录无法读取，原有数据未被修改。请检查备份后重试。':
    'Unable to read existing records. Your stored data has not been changed. Check your backup and retry.',
  '无法更新记录：浏览器存储不可用或空间不足。请导出备份后重试。':
    'Unable to update records. Browser storage is unavailable or full. Export a backup and retry.',
  '此操作在浏览器手记中不可用。': 'This action is not available in the browser diary',

  深空手记: 'Deep Sky Diary',
  主导航: 'Main navigation',
  观测台: 'Observatory',
  星空档案: 'Sky archive',
  暂停动态效果: 'Pause animations',
  开启动态效果: 'Enable animations',
  已遵循系统减少动态效果设置: 'Following your reduced-motion preference',
  暂停动态: 'Pause motion',
  静止模式: 'Still mode',
  退出登录: 'Sign out',
  '无法加载档案。请重试，或稍后再来。': 'Unable to load your archive. Please try again.',
  重新加载: 'Reload',
  '正在加载观测记录…': 'Loading observations…',
  不要温和地走进: 'Do not go gentle',
  那个良夜: 'into that good night',
  '从一片星云，到一座遥远星系。': 'From a nebula to a distant galaxy.',
  '记录目镜里的微光，也记录仰望时的你。':
    'Capture the light in your eyepiece, and the wonder of looking up.',
  开始一次观测: 'Start an observation',
  探索我的档案: 'Explore my archive',
  向下探索: 'Discover more',
  观测日志: 'Observation log',
  '让每一次仰望，都有迹可循。': 'A place for every night under the stars.',
  '慢一点，': 'Take your time.',
  '宇宙会显露更多。': 'The universe will reveal more.',
  '给眼睛一些适应黑暗的时间。': 'Let your eyes adjust to the dark.',
  '在同一个目标上多停留片刻，': 'Stay with one object a little longer.',
  '把第一眼之外的细节也留下。': 'Record the details beyond your first glance.',
  一份写给夜空的耐心: 'A little patience for the night sky',
  次观测记录: 'observations',
  个仰望的夜晚: 'nights under the stars',
  翻开星空档案: 'Open your sky archive',
  那些与星空相遇的瞬间: 'Moments under the stars',
  全部观测: 'All observations',
  '示例手记 · 以下是虚构的记录示范，你的观测将从这里开始。':
    'Sample notes · These fictional entries show how your diary can begin.',
  '每一束微光，': 'Every glimmer ',
  '都有回响。': 'leaves an echo.',
  '在这里，重访那些属于你的宇宙片刻。': 'Revisit your own small moments in the universe.',
  导出记录: 'Export records',
  新观测: 'New observation',
  全部目标: 'All objects',
  搜索观测记录: 'Search observations',
  '搜索目标、地点、笔记…': 'Search objects, locations, notes…',
  '示例手记 · 虚构的观测示范，不计入个人档案。':
    'Fictional sample notes · Not included in your personal archive.',
  隐藏示例: 'Hide samples',
  还没有找到这束光: 'No observations found',
  '你的宇宙，等待第一笔。': 'Your universe awaits its first entry.',
  '试试其他关键词或目标类型。': 'Try another keyword or object type.',
  '从一次仰望、一点微光开始。': 'Begin with a glance upward and a little light.',
  记录观测: 'Record an observation',
  '宇宙很大，慢慢记录。': 'A vast universe. One entry at a time.',
  '记录保存在你的私人账户 · 可在星空档案中导出备份':
    'Saved in your private account · Export a backup from your archive',
  正在退出: 'Signing out',
  正在连接星空档案: 'Connecting to your sky archive',
  开启你的星空手记: 'Begin your sky diary',
  欢迎回到你的宇宙: 'Welcome back to your universe',
  '私人记录已从屏幕清除。': 'Your private records have been cleared from this screen.',
  重试退出: 'Retry sign out',
  '正在确认登录状态…': 'Checking your session…',
  重新连接: 'Reconnect',
  '登录后，观测记录将安全保存在你的私人账户中。':
    'Sign in to save observations in your private account.',
  登录: 'Sign in',
  注册: 'Register',
  用户名: 'Username',
  '3–32 位字母、数字或下划线，不区分大小写':
    '3–32 letters, numbers or underscores; case-insensitive',
  密码: 'Password',
  '12–128 个字符，空格也属于密码': '12–128 characters; spaces count as part of your password',
  '正在处理…': 'Please wait…',
  创建账户: 'Create account',
  进入手记: 'Enter your diary',
  '每个账户拥有独立档案 · 当前版本不提供密码找回':
    'A private archive for each account · Password recovery is not available',
  '今晚，你遇见了什么？': 'What did you discover tonight?',
  目标类型: 'Object type',
  星云: 'Nebula',
  星系: 'Galaxy',
  星团: 'Star cluster',
  其他: 'Other',
  观测目标: 'Observation target',
  '例如：M31 · 仙女座星系': 'e.g. M31 · Andromeda Galaxy',
  观测日期: 'Observation date',
  观测地点: 'Observation location',
  你仰望星空的地方: 'Where you looked up at the stars',
  记录经纬度: 'Record coordinates',
  '可选 · 精确标记观测点': 'Optional · Pinpoint your observing site',
  纬度: 'Latitude',
  '例如 40.12': 'e.g. 40.12',
  '北纬为正，南纬为负 · −90 至 90': 'North +, south − · −90 to 90',
  经度: 'Longitude',
  '例如 116.40': 'e.g. 116.40',
  '东经为正，西经为负 · −180 至 180': 'East +, west − · −180 to 180',
  成像设备: 'Imaging equipment',
  '望远镜 / 镜头': 'Telescope / lens',
  '例如：80 mm APO · 480 mm f/6': 'e.g. 80 mm APO · 480 mm f/6',
  相机: 'Camera',
  '例如：ASI2600MC Pro · −10°C': 'e.g. ASI2600MC Pro · −10°C',
  这一晚的天空: 'Tonight’s sky',
  天空概况: 'Sky conditions',
  通透: 'Clear',
  轻霾: 'Light haze',
  薄云: 'Thin cloud',
  多云: 'Cloudy',
  视宁度: 'Seeing',
  '例如 2.0': 'e.g. 2.0',
  '角秒 · 可留空': 'Arcseconds · Optional',
  云量: 'Cloud cover',
  '例如 10': 'e.g. 10',
  '0–100% · 可留空': '0–100% · Optional',
  相对湿度: 'Relative humidity',
  '例如 65': 'e.g. 65',
  观测笔记: 'Field notes',
  '它在目镜里是什么样子？记录亮度、形状、细节，或此刻的感受……':
    'What did you see? Record brightness, shape, detail, or how this moment felt…',
  '私人手记 · 保存在你的账户': 'Private notes · Saved to your account',
  '正在保存…': 'Saving…',
  收录这束光: 'Save this light',
  选择观测日期: 'Choose observation date',
  观测日历: 'Observation calendar',
  上个月: 'Previous month',
  下个月: 'Next month',
  '回到今晚 ·': 'Tonight ·',
  '也可直接输入 YYYY-MM-DD': 'You can also enter YYYY-MM-DD',
  地点未记录: 'Location not recorded',
  关闭记录: 'Close observation',
  ' / 示例': ' / SAMPLE',
  地点: 'Location',
  未记录: 'Not recorded',
  坐标: 'Coordinates',
  望远镜: 'Telescope',
  设备备注: 'Equipment notes',
  天空: 'Sky',
  湿度: 'Humidity',
  '确定删除这次观测？': 'Delete this observation?',
  '正在删除…': 'Deleting…',
  确认删除: 'Confirm delete',
  保留: 'Keep it',
  删除记录: 'Delete observation',
  '请填写目标名称和观测笔记。': 'Please enter an object name and field notes.',
  '请输入有效的观测日期，格式为 YYYY-MM-DD。':
    'Enter a valid observation date in YYYY-MM-DD format.',
  '请完整填写坐标：纬度 −90° 至 90°，经度 −180° 至 180°。':
    'Enter both coordinates: latitude −90° to 90°, longitude −180° to 180°.',
  '视宁度须大于 0 且不超过 100″；云量和相对湿度须在 0–100% 之间。':
    'Seeing must be 0.01–100″; cloud cover and humidity must be 0–100%.',
  '这一次与星空的相遇，已存入手记。': 'This moment under the stars has been saved.',
  '观测记录已删除。': 'Observation deleted.',
  '观测记录已导出。': 'Observations exported.',
  '登录已失效，请重新登录。': 'Your session has expired. Please sign in again.',
  '用户名须为 3–32 位字母、数字或下划线。':
    'Use 3–32 letters, numbers or underscores for your username.',
  '密码须为 12–128 个字符。': 'Your password must contain 12–128 characters.',
  '服务暂时不可用，请稍后重试。': 'The service is temporarily unavailable. Please try again later.',
  '无法连接服务，请检查连接后重试。': 'Unable to connect. Check your connection and try again.',
  '该用户名已被使用。': 'That username is already taken.',
  '用户名或密码不正确。': 'Incorrect username or password.',
  '请检查目标、日期、坐标、天空数据与笔记长度。':
    'Check the object, date, coordinates, sky data and note length.',
  '请登录后继续。': 'Please sign in to continue.',
  '请求来源无效，请从本站重试。': 'Please try again from this site.',
  '请求内容过长。': 'The request is too large.',
  '请使用 JSON 请求。': 'The request format is unsupported.',
  '请求格式无效。': 'The request format is invalid.',
  '请求字段无效。': 'The request contains invalid fields.',
  '请检查输入格式与日期。': 'Check the input format and date.',
  '尝试过于频繁，请十分钟后重试。': 'Too many attempts. Please try again in ten minutes.',
  '记录不存在。': 'Observation not found.',
  '接口不存在。': 'The requested endpoint was not found.',
  '数据库暂时不可用，请稍后重试。':
    'The database is temporarily unavailable. Please try again later.',
};

export function translate(text: string, language: Language): string {
  if (language === 'zh') return text;
  const logoutSuffix = ' 尚未完成退出，请重试。';
  if (text.endsWith(logoutSuffix)) {
    return `${translate(text.slice(0, -logoutSuffix.length), language)} Sign out is incomplete. Please retry.`;
  }
  return english[text] ?? text;
}

type LanguageContext = {
  language: Language;
  toggleLanguage: () => void;
  t: (text: string) => string;
};
const Context = createContext<LanguageContext | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return localStorage.getItem(preferenceKey) === 'en' ? 'en' : 'zh';
    } catch {
      return 'zh';
    }
  });
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title =
      language === 'zh' ? '深空手记 · Deep Sky Diary' : 'Deep Sky Diary · Observation Journal';
    try {
      localStorage.setItem(preferenceKey, language);
    } catch {
      /* Switching still works when storage is unavailable. */
    }
  }, [language]);
  const t = useCallback((text: string) => translate(text, language), [language]);
  const toggleLanguage = useCallback(
    () => setLanguage((value) => (value === 'zh' ? 'en' : 'zh')),
    [],
  );
  const context = useMemo(() => ({ language, toggleLanguage, t }), [language, toggleLanguage, t]);
  return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useLanguage() {
  const context = useContext(Context);
  if (!context) throw new Error('LanguageProvider is required');
  return context;
}
