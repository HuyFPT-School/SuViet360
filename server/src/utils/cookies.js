const getCookie = (req, key) => {
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${key}=`));

  if (!match) {
    return undefined;
  }

  return decodeURIComponent(match.slice(key.length + 1));
};

module.exports = {
  getCookie,
};
