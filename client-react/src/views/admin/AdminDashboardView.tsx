import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";

type CategoryKey =
  | "students"
  | "notices"
  | "resources"
  | "tasks"
  | "events"
  | "projects";

export const AdminDashboardView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("students");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stats, setStats] = useState({
    students: 0,
    notices: 0,
    resources: 0,
    tasks: 0,
    events: 0,
    projects: 0,
  });

  const categories: { key: CategoryKey; label: string; endpoints: string[] }[] =
    [
      {
        key: "students",
        label: "Students & Users",
        endpoints: ["/users", "/members"],
      },
      {
        key: "notices",
        label: "Notices & Announcements",
        endpoints: ["/notices", "/announcements"],
      },
      {
        key: "resources",
        label: "Resources & Materials",
        endpoints: ["/resources", "/materials"],
      },
      { key: "tasks", label: "Tasks & Assignments", endpoints: ["/tasks"] },
      { key: "events", label: "Events & Calendar", endpoints: ["/events"] },
      { key: "projects", label: "Projects Showcase", endpoints: ["/projects"] },
    ];

  useEffect(() => {
    fetchAllDataAutomatically();
  }, []);

  useEffect(() => {
    fetchCategoryItems(activeCategory);
  }, [activeCategory]);

  const fetchAllDataAutomatically = async () => {
    const newStats: any = {
      students: 0,
      notices: 0,
      resources: 0,
      tasks: 0,
      events: 0,
      projects: 0,
    };

    for (const cat of categories) {
      let fetchedList: any[] = [];
      for (const ep of cat.endpoints) {
        try {
          const res: any = await apiClient.get<any>(ep);
          const raw =
            res?.data?.data || res?.data?.[cat.key] || res?.data || res || [];
          if (Array.isArray(raw) && raw.length > 0) {
            fetchedList = raw;
            break;
          }
        } catch (err) {
          // Skip failed endpoint
        }
      }
      newStats[cat.key] = fetchedList.length;
    }
    setStats(newStats);
  };

  const fetchCategoryItems = async (category: CategoryKey) => {
    setLoading(true);
    const catConfig = categories.find((c) => c.key === category)!;
    let list: any[] = [];

    for (const ep of catConfig.endpoints) {
      try {
        const res: any = await apiClient.get<any>(ep);
        const raw =
          res?.data?.data || res?.data?.[category] || res?.data || res || [];
        if (Array.isArray(raw)) {
          list = raw;
          break;
        }
      } catch (err) {
        console.error(`Error fetching from ${ep}:`, err);
      }
    }

    setItems(list);
    setLoading(false);
  };

  const handleDelete = async (id: number | string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete this record (#${id})?`,
      )
    )
      return;

    try {
      const catConfig = categories.find((c) => c.key === activeCategory)!;
      let deleted = false;

      for (const ep of catConfig.endpoints) {
        try {
          await apiClient.delete<any>(`/users/admin/${activeCategory}/${id}`);
          deleted = true;
          break;
        } catch {
          try {
            await apiClient.delete<any>(`${ep}/${id}`);
            deleted = true;
            break;
          } catch {}
        }
      }

      if (deleted) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        fetchAllDataAutomatically();
      } else {
        alert("Failed to delete record from backend.");
      }
    } catch (error: any) {
      alert(error?.response?.data?.message || "Failed to delete record.");
    }
  };

  const filteredItems = items.filter((item) => {
    const text =
      `${item.name || ""} ${item.full_name || ""} ${item.title || ""} ${item.email || ""} ${item.course_code || ""} ${item.description || ""}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "1200px",
        margin: "0 auto",
        color: "#d6ded8",
      }}
    >
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "1.875rem",
            fontWeight: 700,
            margin: 0,
            color: "#d6ded8",
          }}
        >
          Admin Master Control Center
        </h1>
        <p style={{ color: "#78877d", marginTop: "0.5rem" }}>
          Welcome Admin! All database records and system information are managed
          here.
        </p>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.key;
          return (
            <div
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                backgroundColor: isSelected ? "#1f2c23" : "#101713",
                border: isSelected ? "2px solid #95b399" : "1px solid #1b261f",
                borderRadius: "0.75rem",
                padding: "1.25rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: isSelected ? "#95b399" : "#78877d",
                  fontWeight: 600,
                }}
              >
                {cat.label.split(" ")[0]}
              </div>
              <div
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "#d6ded8",
                  marginTop: "0.5rem",
                }}
              >
                {stats[cat.key]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "#d6ded8",
            margin: 0,
            textTransform: "capitalize",
          }}
        >
          Viewing All {activeCategory} ({filteredItems.length})
        </h2>

        <input
          type="text"
          placeholder={`Search ${activeCategory}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            backgroundColor: "#101713",
            border: "1px solid #1b261f",
            color: "#d6ded8",
            outline: "none",
            minWidth: "260px",
          }}
        />
      </div>

      {/* Items List Box */}
      <div
        style={{
          backgroundColor: "#101713",
          border: "1px solid #1b261f",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div
            style={{ padding: "3rem", textAlign: "center", color: "#78877d" }}
          >
            Loading {activeCategory} records...
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{ padding: "3rem", textAlign: "center", color: "#78877d" }}
          >
            No records found under {activeCategory}.
          </div>
        ) : (
          <div>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid #1b261f",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {item.course_code && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "0.375rem",
                          backgroundColor: "#101713",
                          color: "#7f9fb3",
                          border: "1px solid #1b261f",
                        }}
                      >
                        {item.course_code}
                      </span>
                    )}
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#d6ded8",
                        fontSize: "1rem",
                      }}
                    >
                      {item.title ||
                        item.name ||
                        item.full_name ||
                        `Record #${item.id}`}
                    </span>
                    {item.role && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          textTransform: "uppercase",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "999px",
                          backgroundColor:
                            item.role === "admin"
                              ? "#3b1c1c"
                              : item.role === "cr"
                                ? "#1f2c23"
                                : "#1b261f",
                          color: "#d6ded8",
                        }}
                      >
                        {item.role}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: "0.825rem",
                      color: "#78877d",
                      marginTop: "0.25rem",
                    }}
                  >
                    {activeCategory === "students"
                      ? `${item.email || ""} ${item.student_id ? `• ID: ${item.student_id}` : ""}`
                      : item.description ||
                        item.content ||
                        item.category ||
                        item.status ||
                        `Created: ${item.created_at || "N/A"}`}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    color: "#d66767",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardView;
