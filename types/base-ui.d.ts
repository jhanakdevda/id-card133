import type { ComponentPropsWithRef } from 'react'

declare module '@base-ui/react/button' {
  export namespace Button {
    type Props = ComponentPropsWithRef<'button'>
  }
  export const Button: React.FC<Button.Props>
}
