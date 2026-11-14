import * as EqClass from 'fp-ts/Eq'
import * as N from 'fp-ts/number'
import * as S from 'fp-ts/string'

export type HeaderSection =
  'catalog' | 'about' | 'rubric' | 'adjacent' | 'build' | 'none'

export type HeaderProps = {
  active: HeaderSection
  // In ms since 1970
  now: number
}

export const HeaderPropsEq: EqClass.Eq<HeaderProps> = EqClass.struct({
  active: S.Eq,
  now: N.Eq,
})

export type BottomNavProps = {
  active: HeaderSection
}

export const BottomNavPropsEq: EqClass.Eq<BottomNavProps> = EqClass.struct({
  active: S.Eq,
})
