import * as RD from '@devexperts/remote-data-ts'
import * as EqClass from 'fp-ts/Eq'
import * as N from 'fp-ts/number'
import * as S from 'fp-ts/string'

export type HeaderSection =
  'catalog' | 'about' | 'rubric' | 'adjacent' | 'build' | 'none'

export type HeaderProps = {
  active: HeaderSection
  // In ms since 1970
  now: number
  repoStars: RD.RemoteData<string, number>
}

export const HeaderPropsEq: EqClass.Eq<HeaderProps> = EqClass.struct({
  active: S.Eq,
  now: N.Eq,
  repoStars: RD.getEq(S.Eq, N.Eq),
})

export type BottomNavProps = {
  active: HeaderSection
}

export const BottomNavPropsEq: EqClass.Eq<BottomNavProps> = EqClass.struct({
  active: S.Eq,
})
