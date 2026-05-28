//! ソート規則の適用。

use std::cmp::Ordering;
use std::collections::HashMap;

use crate::models::Track;

use super::condition::{get_field, FieldValue};
use super::schema::{SortOrder, SortRule};

pub fn sort_track_ids(
    mut track_ids: Vec<i64>,
    tracks: &HashMap<i64, Track>,
    rules: &[SortRule],
) -> Vec<i64> {
    if rules.is_empty() {
        return track_ids;
    }

    track_ids.sort_by(|a, b| {
        let ta = tracks.get(a);
        let tb = tracks.get(b);
        match (ta, tb) {
            (None, None) => Ordering::Equal,
            (None, _) => Ordering::Greater,
            (_, None) => Ordering::Less,
            (Some(ta), Some(tb)) => {
                for rule in rules {
                    let va = get_field(ta, &rule.field);
                    let vb = get_field(tb, &rule.field);
                    let ord = compare_field(va.as_ref(), vb.as_ref());
                    if ord != Ordering::Equal {
                        return match rule.order {
                            SortOrder::Asc => ord,
                            SortOrder::Desc => ord.reverse(),
                        };
                    }
                }
                Ordering::Equal
            }
        }
    });

    track_ids
}

fn compare_field(a: Option<&FieldValue>, b: Option<&FieldValue>) -> Ordering {
    // undefined sort last
    match (a, b) {
        (None, None) => Ordering::Equal,
        (None, _) => Ordering::Greater,
        (_, None) => Ordering::Less,
        (Some(a), Some(b)) => compare_values(a, b),
    }
}

fn compare_values(a: &FieldValue, b: &FieldValue) -> Ordering {
    match (a, b) {
        (FieldValue::Int(x), FieldValue::Int(y)) => x.cmp(y),
        (FieldValue::Bool(x), FieldValue::Bool(y)) => x.cmp(y),
        (FieldValue::Str(x), FieldValue::Str(y)) => x.to_lowercase().cmp(&y.to_lowercase()),
        // Mixed: fall back to display-string comparison.
        _ => display(a).cmp(&display(b)),
    }
}

fn display(v: &FieldValue) -> String {
    match v {
        FieldValue::Str(s) => s.to_lowercase(),
        FieldValue::Int(n) => n.to_string(),
        FieldValue::Bool(b) => b.to_string(),
    }
}
