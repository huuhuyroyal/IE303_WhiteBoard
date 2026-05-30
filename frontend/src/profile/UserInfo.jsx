import React from "react";

const UserInfo = ({ avatarUrl, name, email }) => {
  return (
    <article className="flex gap-3 items-center flex-[1_0_0] max-sm:flex-col max-sm:items-center max-sm:text-center">
      <img
        src={avatarUrl || "https://via.placeholder.com/119"}
        alt={name}
        className="w-[119px] h-[119px] rounded-full object-cover"
      />
      <div className="flex flex-col gap-3 max-sm:items-center">
        <h1 className="text-[1.5rem] font-bold text-neutral-900">{name}</h1>
        <p className="text-[1.125rem] text-neutral-900 text-opacity-50">{email}</p>
      </div>
    </article>
  );
};

export default UserInfo;