import {
  ArrowClockwiseIcon, ArrowDownLeftIcon, ArrowRightIcon, ArrowUpRightIcon, BookOpenTextIcon, CaretDownIcon,
  ChatCircleDotsIcon, CheckIcon, CoinsIcon, CopyIcon, EarIcon, EnvelopeSimpleIcon, EyeIcon, EyeSlashIcon,
  GraduationCapIcon, HouseIcon, InfoIcon, KeyboardIcon, LightningIcon, ListIcon, LockKeyIcon, PaperPlaneTiltIcon,
  PersonArmsSpreadIcon, PlusIcon, PulseIcon, ShieldCheckIcon, SignOutIcon, SlidersHorizontalIcon, SparkleIcon,
  SpeakerHighIcon, UserCircleIcon, UsersThreeIcon, WalletIcon, XIcon, type Icon as PhosphorIcon, type IconWeight,
} from '@phosphor-icons/react';

/** Readback's one icon family: Phosphor. Duotone for objects, bold for small directional glyphs. */
const icons = {
  home: HouseIcon, wallet: WalletIcon, send: PaperPlaneTiltIcon, activity: PulseIcon, learn: GraduationCapIcon,
  contacts: UsersThreeIcon, arrow: ArrowRightIcon, keyboard: KeyboardIcon, shield: ShieldCheckIcon,
  settings: SlidersHorizontalIcon, check: CheckIcon, speaker: SpeakerHighIcon, chat: ChatCircleDotsIcon,
  target: EarIcon, bolt: LightningIcon, spark: SparkleIcon, menu: ListIcon, close: XIcon, book: BookOpenTextIcon,
  person: PersonArmsSpreadIcon, external: ArrowUpRightIcon, chevron: CaretDownIcon, refresh: ArrowClockwiseIcon,
  plus: PlusIcon, copy: CopyIcon, receive: ArrowDownLeftIcon, logout: SignOutIcon, coins: CoinsIcon,
  eye: EyeIcon, eyeOff: EyeSlashIcon, lock: LockKeyIcon, mail: EnvelopeSimpleIcon, user: UserCircleIcon, info: InfoIcon,
} satisfies Record<string, PhosphorIcon>;
export type IconName = keyof typeof icons;

const glyphs = new Set<IconName>(['arrow', 'check', 'close', 'chevron', 'plus', 'external', 'menu', 'receive', 'refresh']);

export function Icon({ name, size = 24, weight }: { name: IconName; size?: number; weight?: IconWeight }) {
  const Glyph = icons[name];
  return <Glyph size={size} weight={weight ?? (glyphs.has(name) ? 'bold' : 'duotone')} aria-hidden="true" focusable="false" />;
}
