// @ts-nocheck
import { headStorage } from "./head-storage.ts"

export default function Head() {
    const head = headStorage.getStore()
    return <>
        {head.map(({ element: Element, ...props }, index) => <Element key={index} {...props} />)}
    </>
}
