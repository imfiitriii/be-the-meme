export default function Button({children, onClick}) {
    return (
       <div className="relative w-fit h-fit before:absolute before:w-[calc(100%+0.5em)] before:h-1/2 before:left-[-0.3em] before:top-[-0.3em] before:border before:border-[#0E1822] before:border-b-0 after:absolute after:w-[calc(100%+0.5em)] after:h-1/2 after:left-[-0.3em] after:bottom-[-0.3em] after:border after:border-[#0E1822] after:border-t-0 after:z-0">

    <button
        onClick={onClick}
        className="
      group
      relative
      z-10
      cursor-pointer
      border
      border-[#0E1822]
      bg-[#0E1822]
      px-8
      py-3
      text-[13px]
      font-bold
      tracking-[0.05rem]
      text-white
      transition-all
      duration-300
      ease-in-out
      hover:border-[#46e0ff]
      before:absolute
      before:top-[-1px]
      before:left-[-1px]
      before:h-[0.2rem]
      before:w-[0.2rem]
      before:bg-[#0E1822]
      before:transition-colors
      before:duration-150
      hover:before:bg-white
      after:absolute
      after:right-[-1px]
      after:bottom-[-1px]
      after:h-[0.3rem]
      after:w-[0.3rem]
      after:bg-[#46beff]
      after:transition-colors
      after:duration-150
      hover:after:bg-white
      bg-[length:200%]
      bg-[position:200%]
      bg-no-repeat
      hover:bg-[position:40%]
    "
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 531.28 200'%3E%3Cdefs%3E%3Cstyle%3E .shape %7B fill: %230ea5e9 %7D %3C/style%3E%3C/defs%3E%3Cg id='Layer_2'%3E%3Cg id='Layer_1-2'%3E%3Cpolygon class='shape' points='415.81 200 0 200 115.47 0 531.28 0 415.81 200' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
    >
        {children}
    </button>
</div>
    )
}