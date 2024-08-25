import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import './Dashboard.css';
import { FiSearch } from 'react-icons/fi';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { Tabs, Tab, List, ListItem, ListItemText, Checkbox } from '@mui/material';

const colorPalette = [
    '#FF6384', // Red
    '#36A2EB', // Blue
    '#FFCE56', // Yellow
    '#4BC0C0', // Teal
    '#9966FF'  // Purple
];

const Dashboard = () => {
    const [weightsData, setWeightsData] = useState([]);
    const [inputWeightName, setInputWeightName] = useState('');
    const [inputWeightDetail, setInputWeightDetail] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedWeightId, setSelectedWeightId] = useState('');
    const [secondDrawerOpen, setSecondDrawerOpen] = useState(false);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [widgetSelections, setWidgetSelections] = useState({});
    const [tabLabels, setTabLabels] = useState([]);
    const [tabWidgets, setTabWidgets] = useState({});

    useEffect(() => {
        fetchWeightsData();
    }, [secondDrawerOpen]);

    const fetchWeightsData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3000/weights');
            const data = await response.json();

            const labels = data.map(weight => weight.name);
            const widgetsByTab = labels.reduce((acc, label) => {
                acc[label] = data.find(weight => weight.name === label)?.category.map(cat => cat.name) || [];
                return acc;
            }, {});

            setWeightsData(data);
            setTabLabels(labels);
            setTabWidgets(widgetsByTab);

            const initialSelections = {};
            labels.forEach(label => {
                initialSelections[label] = [];
            });
            setWidgetSelections(initialSelections);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddWeight = async () => {
        if (!inputWeightName || !inputWeightDetail) return;

        try {
            const existingResponse = await fetch(`http://localhost:3000/weights/${selectedWeightId}`);
            if (!existingResponse.ok) {
                console.error('Failed to fetch existing data');
                return;
            }
            const existingData = await existingResponse.json();

            const newCategory = {
                id: String(existingData.category.length + 1),
                name: inputWeightName,
                weight: String(existingData.category.length + 1),
                required: true,
                subcategories: [
                    {
                        name: inputWeightDetail,
                        value: 100
                    }
                ]
            };

            const updatedData = {
                ...existingData,
                category: [...existingData.category, newCategory]
            };

            const updateResponse = await fetch(`http://localhost:3000/weights/${selectedWeightId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (updateResponse.ok) {
                // Fetch the updated weights to reflect the changes
                await fetchWeightsData();
                setInputWeightName('');
                setInputWeightDetail('');
                setDrawerOpen(false);
            } else {
                console.error('Failed to update data');
            }
        } catch (error) {
            console.error('Error adding weight:', error);
        }
    };

    const handleDrawerToggle = (open, id) => () => {
        setDrawerOpen(open);
        setSelectedWeightId(id);
        setSecondDrawerOpen(false);
    };

    const handleTabChange = (event, newValue) => {
        setActiveTabIndex(newValue);
    };

    const handleDrawerClose = () => {
        setSecondDrawerOpen(false);
    };

    const handleWidgetToggle = (tabLabel, widget) => {
        setWidgetSelections(prevSelections => {
            const currentSelections = prevSelections[tabLabel] || [];
            const isSelected = currentSelections.includes(widget);
            const newSelections = isSelected
                ? currentSelections.filter(item => item !== widget)
                : [...currentSelections, widget];

            return {
                ...prevSelections,
                [tabLabel]: newSelections
            };
        });
    };

    const handleConfirmSelection = async () => {
        // Update the weightsData with the selected widgets
        const updatedWeightsData = weightsData.map(weightItem => {
            if (weightItem.name === tabLabels[activeTabIndex]) {
                return {
                    ...weightItem,
                    category: weightItem.category.map(cat => ({
                        ...cat,
                        required: widgetSelections[tabLabels[activeTabIndex]]?.includes(cat.name) || false
                    }))
                };
            }
            return weightItem;
        });
        
        try {
            // Update the server with new data
            const updateResponse = await fetch('http://localhost:3000/weights', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedWeightsData)
            });

            if (updateResponse.ok) {
                // Refresh data to reflect the changes
                await fetchWeightsData();
                handleDrawerClose();
            } else {
                console.error('Failed to update data');
            }
        } catch (error) {
            console.error('Error updating data:', error);
        }
    };

    const filteredWeightsData = weightsData
        .map(weightItem => {
            if (!Array.isArray(weightItem.category)) {
                return null;
            }

            const filteredCategory = weightItem.category.filter(cat =>
                cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cat.subcategories.some(sub =>
                    sub.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );

            return filteredCategory.length > 0 ? { ...weightItem, category: filteredCategory } : null;
        })
        .filter(weightItem => weightItem !== null);

    const chartsData = filteredWeightsData.flatMap(weightItem => {
        return weightItem.category.map(cat => {
            const labels = cat.subcategories.map(sub => sub.name + " (" + sub.value + ")");
            const series = cat.subcategories.map(sub => sub.value);
            const total = series.reduce((acc, value) => acc + value, 0);
            return {
                id: `${weightItem.id}-${cat.id}`,
                name: cat.name,
                chartData: {
                    series: series,
                    options: {
                        chart: {
                            type: 'donut',
                        },
                        labels: labels,
                        colors: colorPalette,
                        legend: {
                            position: 'right',
                        },
                        plotOptions: {
                            pie: {
                                donut: {
                                    labels: {
                                        show: true,
                                        total: {
                                            show: true,
                                            label: 'Total',
                                            formatter: () => total
                                        }
                                    }
                                }
                            }
                        },
                        dataLabels: {
                            enabled: true,
                            formatter: (val, opts) => {
                                return opts.w.config.series[opts.seriesIndex];
                            },
                        },
                    },
                },
            };
        });
    });

    return (
        <>
            <div className="nav-header">
                <span>Home &gt; <strong> Dashboard V2</strong></span>
                <div className="search-bar">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search anything.."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="dashboard">
                <div className="header">
                    <h3>CNAPP Dashboard</h3>
                    <div className="header-icons">
                        <button className="time-filter" onClick={() => setSecondDrawerOpen(true)}>Add Weight +</button>
                        <button className="settings-btn">
                            <RefreshIcon />
                        </button>
                        <button className="menu-btn">
                            <MoreVertIcon />
                        </button>
                        <button className="time-filter">Last 2 days ▼</button>
                    </div>
                </div>
            </div>
            <div className="widgets-container">
                {filteredWeightsData.map(weightItem => (
                    <div key={weightItem.id} className="weight-grid">
                        <h4>{weightItem.name}</h4>
                        <div className="category-grid">
                            {weightItem.category
                                .filter(cat => cat.required) // Filter categories where `required` is true
                                .map(cat => (
                                    <div key={cat.id} className="widget">
                                        <h3>{cat.name}</h3>
                                        <div className="widget-content chart-with-labels">
                                            <div className="chart-section">
                                                <ReactApexChart
                                                    options={chartsData.find(data => data.id === `${weightItem.id}-${cat.id}`)?.chartData?.options || {}}
                                                    series={chartsData.find(data => data.id === `${weightItem.id}-${cat.id}`)?.chartData?.series || []}
                                                    type="donut"
                                                    height={200}
                                                    width={400}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }

                            {searchQuery === "" && (
                                <div className="widget add-button">
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        sx={{ margin: 2 }}
                                        onClick={handleDrawerToggle(true, weightItem.id)}
                                    >
                                        + Add Weight
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerToggle(false)}>
                    <Box
                        sx={{
                            width: 600,
                            bgcolor: 'blue',
                            color: 'white',
                            padding: 2,
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">Add Weight</Typography>
                            <IconButton onClick={handleDrawerToggle(false)} sx={{ color: 'white' }}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                    <Box sx={{ paddingTop: 2, paddingX: 2, bgcolor: 'white' }}>
                        <TextField
                            fullWidth
                            value={inputWeightName}
                            onChange={(e) => setInputWeightName(e.target.value)}
                            label="Enter weight name"
                        />
                        <TextField
                            fullWidth
                            value={inputWeightDetail}
                            onChange={(e) => setInputWeightDetail(e.target.value)}
                            label="Enter weight text"
                            sx={{ marginTop: 2 }}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={handleAddWeight}
                            sx={{ marginTop: 2 }}
                        >
                            Add Weight +
                        </Button>
                    </Box>
                </Drawer>

                <Drawer anchor="right" open={secondDrawerOpen} onClose={handleDrawerClose}>
                    <Box
                        sx={{
                            width: 600,
                            bgcolor: 'blue',
                            color: 'white',
                            padding: 2,
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">Add Widgets</Typography>
                            <IconButton onClick={handleDrawerClose} sx={{ color: 'white' }}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                    <Box sx={{ padding: 2 }}>
                        <Tabs value={activeTabIndex} onChange={handleTabChange} variant="fullWidth">
                            {tabLabels.map((label, index) => (
                                <Tab key={index} label={label} />
                            ))}
                        </Tabs>
                    </Box>
                    <Box sx={{ marginTop: 0, padding: 2 }}>
                        <List>
                            {tabWidgets[tabLabels[activeTabIndex]]?.map((widget, index) => {
                                const weightItem = weightsData.find(weight => weight.name === tabLabels[activeTabIndex]);
                                const category = weightItem?.category?.find(cat => cat.name === widget);

                                // Compute the checked state: Check if widget is in the selections or if it is required.
                                const isChecked = widgetSelections[tabLabels[activeTabIndex]]?.includes(widget) || (category?.required === true);

                                const handleCheckboxChange = (event) => {
                                    console.log("tabLabels[activeTabIndex]",tabLabels[activeTabIndex])
                                    console.log("widget",widget)
                                    console.log("event",event.target.value)
                                    handleWidgetToggle(tabLabels[activeTabIndex], widget);
                                };

                                return (
                                    <ListItem
                                        key={index}
                                        button
                                        sx={{ border: '1px solid #ddd', borderRadius: '4px', mb: 1 }}
                                    >
                                        <Checkbox
                                            checked={isChecked}
                                            onChange={handleCheckboxChange}
                                            tabIndex={-1}
                                            disableRipple
                                        />
                                        <ListItemText primary={widget} />
                                    </ListItem>
                                );
                            })}
                        </List>

                    </Box>
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            width: '90%',
                            padding: 2,
                            bgcolor: 'white',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}
                    >
                        <Button onClick={handleDrawerClose} variant="outlined" sx={{ marginRight: 1 }}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmSelection} variant="contained" color="primary">
                            Confirm
                        </Button>
                    </Box>
                </Drawer>
            </div>
        </>
    );
};

export default Dashboard;
